'use strict';

var tagNameCharsRegExp = /[a-zA-Z0-9_.:-]/;
var tagNameRegExp = /[a-zA-Z0-9.\-:#]+$/;
var attrNameCharsRegExp = /[a-zA-Z0-9_#.:-]/;
var attrNameRegExp = /([a-zA-Z0-9.\-:]+)(\s*\(|$)/;
var stateVarRegExp = /^state(\b|$)/;
var dataVarRegExp = /^data(\b|$)/;

var SCOPE_ATTR = 'attr';
var SCOPE_TAG = 'tag';
var SCOPE_STRING = 'string';
var SCOPE_MARKO = 'marko';

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

        var hasArgument = false;

        var text = this.text.replace(/\s*\($/, function() {
            hasArgument = true;
            return '';
        });

        if (scopeType === SCOPE_TAG) {
            return {
                range: this.range,
                tagName: text,
                tagHasArgument: hasArgument
            };
        } else if (scopeType === SCOPE_ATTR) {
            let tagName = this.getTagNameFromPos(pos);
            if (tagName) {
                return {
                    range: this.range,
                    tagName,
                    attributeName: text,
                    attributeHasArgument: hasArgument
                };
            }
        } else if (scopeType === SCOPE_STRING) {
            if (text.charAt(0) === '"' || text.charAt(0) === "'") {
                text = text.substring(1, text.length - 1);
            }

            let attrInfo = this.getAttrInfoFromPos(pos);
            if (attrInfo) {
                return {
                    range: this.range,
                    attributeName: attrInfo.name,
                    literalValue: text,
                    attributeHasArgument: attrInfo.hasArgument
                };
            } else {
                return {
                    range: this.range,
                    literalValue: text
                };
            }
        } else if (scopeType === SCOPE_MARKO) {
            if (stateVarRegExp.test(text)) {
                return {
                    stateVar: true
                };
            } else if (dataVarRegExp.test(text)) {
                return {
                    dataVar: true
                };
            }
        }
    }

    getScopeType(scopeNames) {
        if (scopeNames.length === 1 && scopeNames[0] === 'text.marko') {
            return SCOPE_MARKO;
        }

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

    getAttrInfoFromPos(pos) {
        let curPos = pos;

        while(curPos) {
            let charAtPos = this.charAt(curPos);
            if (attrNameCharsRegExp.test(charAtPos)) {
                if (this.isAttrAtPos(curPos)) {
                    let line = this.lineUpToPos(curPos, true /*inclusive*/);
                    var attrNameMatches = attrNameRegExp.exec(line);
                    if (attrNameMatches) {
                        return {
                            name: attrNameMatches[1],
                            hasArgument: attrNameMatches[1] != null
                        };
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