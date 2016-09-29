'use strict';

var tagNameCharsRegExp = /[a-zA-Z0-9_.:-]/;
var tagNameRegExp = /[a-zA-Z0-9.\-:#]+$/;
var attrNameCharsRegExp = /[a-zA-Z0-9_#.:-]/;
var attrNameRegExp = /[a-zA-Z0-9.\-:]+$/;

var SCOPE_ATTR = 'attr';
var SCOPE_TAG = 'tag';
var SCOPE_STRING = 'string';

class Inspector {
    constructor(textEditor, text, range) {
        this.textEditor = textEditor;
        this.text = text;
        this.range = range;
    }

    inspect() {
        var pos = this.range.start;
        var scopeNames = this.getScopeNames(pos);

        var scopeType = this.getScopeType(scopeNames);

        if (scopeType === SCOPE_TAG) {
            return {
                range: this.range,
                tagName: this.text
            };
        } else if (scopeType === SCOPE_ATTR) {
            let tagName = this.getTagNameFromPos(pos);
            if (tagName) {
                return {
                    range: this.range,
                    tagName,
                    attributeName: this.text
                };
            }
        } else if (scopeType === SCOPE_STRING) {
            var text = this.text;
            if (text.charAt(0) === '"' || text.charAt(0) === "'") {
                try {
                    text = JSON.parse(text);
                } catch(e) {}
            }
            let attrName = this.getAttrNameFromPos(pos);
            if (attrName) {
                return {
                    range: this.range,
                    attributeName: attrName,
                    literalValue: text
                };
            } else {
                return {
                    range: this.range,
                    literalValue: text
                };
            }
        }
    }

    getScopeType(scopeNames) {
        for (var i=0; i<scopeNames.length; i++) {
            var scopeName = scopeNames[i];

            if (scopeName.startsWith('entity.name.tag') || scopeName.startsWith('support.function.marko-tag') || scopeName.startsWith('meta.tag')) {
                return SCOPE_TAG;
            } else if (scopeName.startsWith('string.quoted') || scopeName.startsWith('punctuation.definition.string')) {
                return SCOPE_STRING;
            } else if (scopeName.startsWith('entity.other.attribute-name') || scopeName.startsWith('support.function.marko-attribute')) {
                return SCOPE_ATTR;
            }
        }
    }

    getScopeNames(pos) {
        if (!pos || pos === this.pos) {
            return this.scopeDescriptor.getScopesArray();
        } else {
            let scopeDescriptor = this.textEditor.scopeDescriptorForBufferPosition(pos);
            return scopeDescriptor.getScopesArray();
        }
    }

    charAt(pos) {
        var line = this.textEditor.lineTextForBufferRow(pos.row);
        return line.charAt(pos.column);
    }

    lineUpToPos(pos, inclusive) {
        var line = this.textEditor.lineTextForBufferRow(pos.row);
        return line.substring(0, inclusive ? pos.column + 1 : pos.column);
    }

    lineFromPos(pos) {
        var line = this.textEditor.lineTextForBufferRow(pos.row);
        return line.substring(pos.column);
    }

    lineAt(pos) {
        var line = this.textEditor.lineTextForBufferRow(pos.row);
        return line;
    }

    getPreviousPos(pos) {
        var row = pos.row;
        var column = pos.column;

        if (column === 0) {
            if (row === 0) {
                return null;
            }

            row--;

            let prevLine = this.textEditor.lineTextForBufferRow(row);
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

    getTagNameFromPos(pos) {
        let curPos = pos;

        while(curPos) {
            let charAtPos = this.charAt(curPos);
            if (tagNameCharsRegExp.test(charAtPos)) {
                if (this.isTagAtPos(curPos)) {
                    let line = this.lineUpToPos(curPos, true /*inclusive*/);
                    var tagNameMatches = tagNameRegExp.exec(line);
                    if (tagNameMatches) {
                        return tagNameMatches[0];
                    }
                }
            }
            curPos = this.getPreviousPos(curPos);
        }

        return null;
    }

    getAttrNameFromPos(pos) {
        let curPos = pos;

        while(curPos) {
            let charAtPos = this.charAt(curPos);
            if (attrNameCharsRegExp.test(charAtPos)) {
                if (this.isAttrAtPos(curPos)) {
                    let line = this.lineUpToPos(curPos, true /*inclusive*/);
                    var attrNameMatches = attrNameRegExp.exec(line);
                    if (attrNameMatches) {
                        return attrNameMatches[0];
                    }
                }
            }
            curPos = this.getPreviousPos(curPos);
        }

        return null;
    }

    isTagAtPos(pos) {
        var scopeNames = this.getScopeNames(pos);
        var scopeType = this.getScopeType(scopeNames);
        return scopeType === SCOPE_TAG;
    }

    isAttrAtPos(pos) {
        var scopeNames = this.getScopeNames(pos);
        var scopeType = this.getScopeType(scopeNames);
        return scopeType === SCOPE_ATTR;
    }
}

module.exports = Inspector;