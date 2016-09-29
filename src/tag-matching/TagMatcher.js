var CompositeDisposable = require('atom').CompositeDisposable;
const Tag = require('./Tag');
const MatchedTags = require('./MatchedTags');

const TOKEN_OPEN_TAG_NAME = 'OPEN_TAG_NAME';
const TOKEN_OPEN_TAG_END = 'OPEN_TAG_END';
const TOKEN_OPEN_TAG_END_SELF_CLOSE = 'OPEN_TAG_END_SELF_CLOSE';
const TOKEN_OPEN_TAG_START = 'OPEN_TAG_START';
const TOKEN_CLOSE_TAG_NAME = 'CLOSE_TAG_NAME';
const TOKEN_CLOSE_TAG_END = 'CLOSE_TAG_END';
const TOKEN_CLOSE_TAG_START = 'CLOSE_TAG_START';
const TOKEN_ATTR = 'ATTR';

var Range = require('atom').Range;

var tokensRegExp = /\/>|>|<\/|<|[a-zA-Z0-9\-:]+/g;

class TagMatcher {
    constructor(editor) {
        this.editor = editor;
        this.subscriptions = new CompositeDisposable();
        this.matchedTags = null;
    }

    unhighlight() {
        if (this.matchedTags) {
            this.matchedTags.unhighlight(this.editor);
            this.matchedTags = null;
        }
    }

    highlight() {
        if (this.editor.hasMultipleCursors()) {
            this.unhighlight();
            return;
        }

        var pos = this.editor.getCursorBufferPosition();
        if (!pos) {
            return;
        }

        var tag = this.getTagForPos(pos);
        if (!tag) {
            this.currentTag = null;
            return;
        }

        var matchedTags;


        if (tag.isSelfClosedTag) {
            matchedTags = new MatchedTags(tag, null, tag);
        } else {
            var matchingTag;



            if (tag.isOpenTag) {
                // We need to scan forward to find the matching open tag
                matchingTag = this.findMatchingCloseTag(tag.range.end);
                matchedTags = new MatchedTags(tag, matchingTag, tag);
            } else {
                matchingTag = this.findMatchingOpenTag(tag.range.start);
                matchedTags = new MatchedTags(matchingTag, tag, tag);
            }
        }

        this.matchedTags = matchedTags;
        this.matchedTags.highlight(this.editor);
        //
        // if (tag.tagNameMarker) {
        //     tag.tagNameMarker.onDidChange((event) => {
        //         if (event.textChanged) {
        //             var pos = this.editor.getCursorBufferPosition();
        //             if (tag.containsCursor(pos)) {
        //                 matchedTags.synchronizeTagName(this.editor);
        //             }
        //         }
        //
        //     });
        // }

    }

    beginWatching() {
        this.subscriptions.add(this.editor.getBuffer().onDidChangeText((event) => {
            if (this.matchedTags) {
                var cursorPos = this.editor.getCursorBufferPosition();
                if (this.matchedTags.activeTag.tagNameContainsCursor(cursorPos)) {
                    this.matchedTags.synchronizeTagName(this.editor);
                    return;
                }
            }

            this.unhighlight();
            this.highlight();
        }));

        this.subscriptions.add(this.editor.onDidChangeCursorPosition((event) => {
            if (this.editor.hasMultipleCursors()) {
                this.unhighlight();
                return;
            }

            var cursor = event.cursor;

            if (this.matchedTags) {
                let cursorPos = cursor.getBufferPosition();
                if (this.matchedTags.activeTag.containsCursor(cursorPos)) {
                    // Nothing to do, the cursor is still within the matching tags
                    return;
                } else {
                    let inactiveTag = this.matchedTags.inactiveTag;
                    if (inactiveTag && inactiveTag.containsCursor(cursorPos)) {
                        this.matchedTags.swapActiveTag();
                        return;
                    } else {
                        this.unhighlight();
                    }
                }
            }

            this.highlight();
        }));

        this.editor.onDidDestroy(() => {
            this.destroy();
        });

        this.subscriptions.add(this.editor.onDidChangeGrammar((event) => {
            this.unhighlight();
            this.highlight();
        }));

        this.highlight();
    }

    findMatchingCloseTag(pos) {
        var openCount = 1;
        var closeTag;

        this.scanTags(pos, (m) => {
            var curTag = m.tag;
            if (curTag.isSelfClosedTag) {
                return;
            } else if (curTag.isOpenTag) {
                openCount++;
            } else {
                if (--openCount === 0) {
                    closeTag = curTag;
                    m.stop();
                }
            }
        });

        return closeTag;
    }

    findMatchingOpenTag(pos) {
        var openCount = 1;
        var openTag;

        this.backwardsScanTags(pos, (m) => {
            var curTag = m.tag;
            if (curTag.isSelfClosedTag) {
                return;
            } else if (curTag.isOpenTag) {
                if (--openCount === 0) {
                    openTag = curTag;
                    m.stop();
                }
            } else {
                openCount++;
            }
        });

        return openTag;
    }

    destroy() {
        this.subscriptions.dispose();
    }

    getScopeNames(pos) {
        let scopeDescriptor = this.editor.scopeDescriptorForBufferPosition(pos);
        return scopeDescriptor.getScopesArray();
    }

    backwardsScanTokens(pos, iterator) {
        var beginPos = {row:0, column:0};
        var range = [beginPos, pos];

        tokensRegExp.lastIndex = 0;

        this.editor.backwardsScanInBufferRange(tokensRegExp, range, (m) => {
            var token = this.getTokenAtPosition(m.range.start);
            if (!token) {
                return;
            }

            m.token = token;
            iterator(m);
        });
    }

    scanTokens(pos, iterator) {
        var buffer = this.editor.getBuffer();
        var endPos = buffer.getEndPosition();
        var range = [pos, endPos];

        tokensRegExp.lastIndex = 0;

        this.editor.scanInBufferRange(tokensRegExp, range, (m) => {
            var token = this.getTokenAtPosition(m.range.start);
            if (!token) {
                return;
            }

            m.token = token;
            iterator(m);
        });
    }

    scanTags(pos, iterator) {
        var foundStart = false;
        var tagNameRange = null;
        var start = null;
        var end = null;
        var isOpenTag = false;
        var isSelfClosedTag = false;

        this.scanTokens(pos, (m) => {
            // console.log('TOKEN', m.token, 'TEXT:', m.matchText);
            switch(m.token) {
                case TOKEN_OPEN_TAG_START:
                    isOpenTag = true;
                    /* falls through */
                case TOKEN_CLOSE_TAG_START:
                    start = m.range.start;
                    foundStart = true;
                    break;
                case TOKEN_OPEN_TAG_NAME:
                    isOpenTag = true;
                    /* falls through */
                case TOKEN_CLOSE_TAG_NAME:
                    tagNameRange = m.range;
                    // console.log('TAG NAME', this.editor.getTextInBufferRange(m.range));
                    break;
                case TOKEN_OPEN_TAG_END_SELF_CLOSE:
                    isSelfClosedTag = true;
                    /* falls through */
                case TOKEN_OPEN_TAG_END:
                case TOKEN_CLOSE_TAG_END:
                    if (foundStart) {
                        end = m.range.end;
                        let tagRange = new Range(start, end);
                        // console.log('TAG', this.editor.getTextInBufferRange(tagRange), 'isOpenTag:', isOpenTag);
                        m.tag = new Tag(tagNameRange, tagRange, isOpenTag, isSelfClosedTag, this.editor);
                        iterator(m);
                    }

                    isOpenTag = false;
                    tagNameRange = null;
                    isSelfClosedTag = false;
                    foundStart = false;
                    break;
            }
        });
    }

    backwardsScanTags(pos, iterator) {
        var foundEnd = false;
        var tagNameRange = null;
        var start = null;
        var end = null;
        var isOpenTag = false;
        var isSelfClosedTag = false;

        this.backwardsScanTokens(pos, (m) => {
            switch(m.token) {
                case TOKEN_OPEN_TAG_START:
                    isOpenTag = true;
                    /* falls through */
                case TOKEN_CLOSE_TAG_START:
                    start = m.range.start;
                    if (foundEnd) {
                        let tagRange = new Range(start, end);
                        m.tag = new Tag(tagNameRange, tagRange, isOpenTag, isSelfClosedTag, this.editor);
                        iterator(m);
                    }

                    isOpenTag = false;
                    tagNameRange = null;
                    isSelfClosedTag = false;
                    break;
                case TOKEN_OPEN_TAG_NAME:
                    isOpenTag = true;
                    /* falls through */
                case TOKEN_CLOSE_TAG_NAME:
                    tagNameRange = m.range;
                    break;
                case TOKEN_OPEN_TAG_END_SELF_CLOSE:
                    isSelfClosedTag = true;
                    /* falls through */
                case TOKEN_OPEN_TAG_END:
                case TOKEN_CLOSE_TAG_END:
                    foundEnd = true;
                    end = m.range.end;
                    break;
            }
        });
    }

    getTokenAtPosition(pos) {
        var scopeNames = this.getScopeNames(pos);

        for (let i=0; i<scopeNames.length; i++) {
            let scopeName = scopeNames[i];
            if (scopeName.endsWith('.html')) {
                if (scopeName === 'punctuation.definition.marko-tag.end.self-close.html') {
                    return TOKEN_OPEN_TAG_END_SELF_CLOSE;
                } else if (scopeName === 'punctuation.definition.marko-tag.begin.open.html') {
                    return TOKEN_OPEN_TAG_START;
                } else if (scopeName === 'punctuation.definition.marko-tag.end.open.html') {
                    return TOKEN_OPEN_TAG_END;
                }  else if (scopeName === 'punctuation.definition.marko-tag.begin.close.html') {
                    return TOKEN_CLOSE_TAG_START;
                } else if (scopeName === 'punctuation.definition.marko-tag.end.close.html') {
                    return TOKEN_CLOSE_TAG_END;
                } else if (scopeName.startsWith('entity.name.tag') || scopeName.startsWith('support.function.marko-tag')) {
                    if (scopeName.endsWith('.close.html')) {
                        return TOKEN_CLOSE_TAG_NAME;
                    } else {
                        return TOKEN_OPEN_TAG_NAME;
                    }
                } else if (scopeName.startsWith('entity.other.attribute-name')) {
                    return TOKEN_ATTR;
                }
            }
        }

        return undefined;
    }

    charAt(pos) {
        var line = this.editor.lineTextForBufferRow(pos.row);
        return line.charAt(pos.column);
    }

    getTagForPos(pos) {
        var token = this.getTokenAtPosition(pos);

        var isSelfClosedTag;
        var tagNameRange = null;
        var isOpenTag = false;
        var start;
        var end;

        if (token === undefined) {
            // Maybe:
            // <foo| foo="test"> - token === undefined
            var prevPos = this.getPreviousPos(pos);
            var prevPosToken = prevPos ? this.getTokenAtPosition(prevPos) : null;
            if (prevPosToken !== TOKEN_OPEN_TAG_NAME) {
                return;
            }

            this.backwardsScanTokens(pos, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_NAME:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_NAME:
                        tagNameRange = m.range;
                        break;
                    case TOKEN_CLOSE_TAG_START:
                    case TOKEN_OPEN_TAG_START:
                        start = m.range.start;
                        m.stop();
                        break;
                }
            });
        } else if (token === TOKEN_OPEN_TAG_END_SELF_CLOSE || token === TOKEN_OPEN_TAG_END || token === TOKEN_CLOSE_TAG_END) {
            // <foo|/> - token === TOKEN_OPEN_TAG_END_SELF_CLOSE
            // // <foo/|> - token === TOKEN_OPEN_TAG_END_SELF_CLOSE
            // <foo|>  - token === TOKEN_OPEN_TAG_END
            // </foo|> - token === TOKEN_OPEN_TAG_END

            if (token === TOKEN_OPEN_TAG_END_SELF_CLOSE) {
                isSelfClosedTag = true;
                if (this.charAt(pos) === '/') {
                    end = { row: pos.row, column: pos.column + 2};
                } else {
                    end = { row: pos.row, column: pos.column + 1};
                }
            } else {
                end = { row: pos.row, column: pos.column + 1};
            }

            isSelfClosedTag = token === TOKEN_OPEN_TAG_END_SELF_CLOSE;

            // We need to scan backwards until we find the start of the tag
            this.backwardsScanTokens(pos, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_NAME:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_NAME:
                        tagNameRange = m.range;
                        break;
                    case TOKEN_CLOSE_TAG_START:
                    case TOKEN_OPEN_TAG_START:
                        start = m.range.start;
                        m.stop();
                        break;
                }
            });
        } else if (token === TOKEN_OPEN_TAG_START || token === TOKEN_CLOSE_TAG_START) {
            // |<foo>  - token === TOKEN_OPEN_TAG_START
            // |<foo/> - token === TOKEN_OPEN_TAG_START
            // |</foo> - token === TOKEN_CLOSE_TAG_START
            // <|/foo> - token === TOKEN_CLOSE_TAG_START

            if (this.charAt(pos) === '/') {
                start = this.getPreviousPos(pos);
            } else {
                start = pos;
            }

            // We need to scan forward until we find the tag name
            this.scanTokens(pos, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_NAME:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_NAME:
                        tagNameRange = m.range;
                        m.stop();
                        break;
                }
            });
        } else if (token === TOKEN_OPEN_TAG_NAME || token === TOKEN_CLOSE_TAG_NAME) {
            // <|foo>  - token === TOKEN_OPEN_TAG_NAME
            // </|foo> - token === TOKEN_CLOSE_TAG_NAME

            // We need to scan backwards until we find the start of the tag
            this.backwardsScanTokens(pos, (m) => {
                switch(m.token) {
                    case TOKEN_CLOSE_TAG_START:
                    case TOKEN_OPEN_TAG_START:
                        start = m.range.start;
                        m.stop();
                        break;
                }
            });

            // Now we need to scan forward to find the complete tag name
            this.scanTokens(start, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_NAME:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_NAME:
                        tagNameRange = m.range;
                        m.stop();
                        break;
                }
            });
        }  else if (token === TOKEN_ATTR) {
            // <foo |foo="">  - token === ATTR

            // We need to scan backwards until we find the start of the tag
            this.backwardsScanTokens(pos, (m) => {
                switch(m.token) {
                    case TOKEN_CLOSE_TAG_START:
                    case TOKEN_OPEN_TAG_START:
                        start = m.range.start;
                        m.stop();
                        break;
                }
            });

            // Now we need to scan forward to find the complete tag name
            this.scanTokens(start, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_NAME:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_NAME:
                        tagNameRange = m.range;
                        m.stop();
                        break;
                }
            });
        } else {
            throw new Error('Illegal state');
        }

        if (!end) {
            this.scanTokens(tagNameRange.end, (m) => {
                switch(m.token) {
                    case TOKEN_OPEN_TAG_END_SELF_CLOSE:
                        isSelfClosedTag = true;
                        /* falls through */
                    case TOKEN_OPEN_TAG_END:
                        isOpenTag = true;
                        /* falls through */
                    case TOKEN_CLOSE_TAG_END:
                        end = m.range.end;
                        m.stop();
                        break;
                }
            });
        }

        var range = new Range(start, end);
        return new Tag(tagNameRange, range, isOpenTag, isSelfClosedTag, this.editor);
    }

    isSelfClosedTag(pos) {
        var isSelfClosedTag = false;

        this.scanTokens(pos, (m) => {
            if (m.token === TOKEN_OPEN_TAG_END_SELF_CLOSE) {
                isSelfClosedTag = true;
                m.stop();
            } else if (m.token === TOKEN_CLOSE_TAG_END || m.token === TOKEN_OPEN_TAG_END) {
                m.stop();
            }
        });

        return isSelfClosedTag;
    }

    getPreviousPos(pos) {
        var row = pos.row;
        var column = pos.column;

        if (column === 0) {
            if (row === 0) {
                return null;
            }

            row--;

            let prevLine = this.editor.lineTextForBufferRow(row);
            if (prevLine.length) {
                column = prevLine.length - 1;
            } else {
                column = 0;
            }
        } else {
            column = column - 1;
        }

        return {row, column};
    }
}

module.exports = TagMatcher;