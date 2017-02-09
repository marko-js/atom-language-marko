const MarkoAutocompleteInspector = require('./MarkoAutocompleteInspector');
const completionType = require('./completion-type');
const markoUtil = require('../util/marko');
const snippetPlaceholdersRegExp = /\$\{[0-9]+\:([^}]+)\}|\$\{[0-9]+\}|\$[0-9]+/g;
const fuzzaldrinPlus = require('fuzzaldrin-plus');
const path = require('path');
const lassoPackageRoot = require('lasso-package-root');
const ok = require('assert').ok;

const SORT_PRIORITY_GLOBAL = 5;
const SORT_PRIORITY_LOCAL = 10;
const EMPTY_ARRAY = [];

function getDefaultDir() {
    var project = atom.project;
    var directories = project.getDirectories();
    if (directories && directories.length) {
        return directories[0].getPath();
    }
    return __dirname;
}

// function firstCharsEqual(str1, str2) {
//     return str1[0].toLowerCase() === str2[0].toLowerCase();
// }

function getDisplayTextForSnippet(snippet) {
    snippetPlaceholdersRegExp.index = 0;
    return snippet.replace(snippetPlaceholdersRegExp, function(match, label) {
        if (label) {
            return '<' + label + '>';
        } else {
            return '';
        }
    });
}

function getTaglibLabel(taglibPath) {
    var rootPackage = lassoPackageRoot.getRootPackage(taglibPath);
    if (rootPackage) {
        return rootPackage.name + '/' + path.relative(rootPackage.__dirname, taglibPath);
    } else {
        var parentDir = path.dirname(taglibPath);
        return path.basename(parentDir);
    }
}

function SUGGESTION_COMPARATOR_HELPER(a, b) {
    var aPriority = a.sortPriority || 0;
    var bPriority = b.sortPriority || 0;

    if (aPriority || bPriority) {
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
    }

    let aSortScore = a.sortScore || 0;
    let bSortScore = b.sortScore || 0;

    if (aSortScore || bSortScore) {
        return bSortScore - aSortScore;
    } else {
        let aText = a.sortText;
        let bText = b.sortText;
        return aText.localeCompare(bText);
    }
}

function SUGGESTION_COMPARATOR(a, b) {
    var result = SUGGESTION_COMPARATOR_HELPER(a, b);
    if (result === 0) {
        // We use suggestion index to keep the sort stable
        var aIndex = a.index;
        var bIndex = b.index;
        return aIndex < bIndex ? -1 : 1;
    } else {
        return result;
    }
}

class SuggestionsBuilder {
    constructor(request) {
        ok(request, '"request" is required');
        var inspector = new MarkoAutocompleteInspector(request);

        var inspected = this.inspected = inspector.inspect();

        this.prefix = inspected ? inspected.prefix : request.prefix;

        var editor = request.editor;

        var filePath = editor.getPath();
        this.filePath = filePath;

        this.suggestions = [];

        this._taglibLookup = undefined;

        this.markoMajorVersion = markoUtil.getMarkoMajorVersion(this.dir);
    }

    getSuggestions() {
        var inspected = this.inspected;
        if (!inspected) {
            return EMPTY_ARRAY;
        }

        switch (inspected.completionType) {
            case completionType.TAG_START:
            case completionType.TAG_END:
                this.addTagSuggestions(inspected);
                break;
            case completionType.ATTR_NAME:
                this.addAttributeSuggestions(inspected);
                break;
            case completionType.ATTR_VALUE:
                this.addAttributeValueSuggestions(inspected);
                break;
        }

        if (this.suggestions.length) {
            this.suggestions.sort(SUGGESTION_COMPARATOR);
        }

        return this.suggestions;
    }

    addSuggestion(suggestion) {
        var sortText = suggestion.sortText = suggestion.sortText || suggestion.displayText || suggestion.snippet || suggestion.text;

        if (this.prefix) {
            suggestion.sortScore = fuzzaldrinPlus.score(sortText, this.prefix);
            if (suggestion.sortScore <= 0) {
                return;
            }
        }

        suggestion.replacementPrefix = this.prefix;
        suggestion.index = this.suggestions.length;
        this.suggestions.push(suggestion);
    }

    get dir() {
        var filePath = this.filePath;
        var dir;

        if (filePath) {
            dir = path.dirname(filePath);
        } else {
            dir = getDefaultDir();
        }

        return dir;
    }

    get taglibLookup() {
        var taglibLookup = this._taglibLookup;
        if (!taglibLookup) {
            var dir = this.dir;
            taglibLookup = this._taglibLookup = markoUtil.loadMarkoCompiler(dir).buildTaglibLookup(dir);
        }

        return taglibLookup;

    }

    shouldAllowSuggestion(name) {
        // var prefix = this.prefix;
        //
        // if (!prefix || firstCharsEqual(name, prefix)) {
        //     return true;
        // }

        return true;
    }

    addTagSuggestions(inspected) {
        var markoMajorVersion = this.markoMajorVersion;
        if (markoMajorVersion == null || markoMajorVersion >= 3) {
            let prefix = this.prefix;

            if (this.inspected.completionType === completionType.TAG_END) {
                let text = inspected.tagName + ( inspected.shouldCompleteEndingTag ? '>' : '' );

                if (this.prefix !== text) {
                    this.addSuggestion({
                        text: text,
                        displayText: inspected.tagName,
                        sortText: inspected.tagName,
                        type: 'tag'
                    });
                }
                return;
            }

            if (inspected.hasShorthand) {
                if (inspected.concise !== true && inspected.shouldCompleteEndingTag !== false) {
                    let tagName = inspected.tagName;

                    this.addSuggestion({
                        text: tagName,
                        displayText: '<' + prefix + '></' + tagName + '>',
                        type: 'tag',
                        snippet: prefix + '${1}>${2}</' +tagName + '>'
                    });
                }

                return;
            }

            var taglibLookup = this.taglibLookup;

            taglibLookup.getTagsSorted().forEach((tag) => {
                if (tag.deprecated || tag.name.indexOf('*') !== -1 || tag.name.startsWith('_')) {
                    return;
                }

                if (this.shouldAllowSuggestion(tag.name)) {
                    this.addCustomTagSuggestion(tag, inspected);
                }
            });
        }
    }

    addAttributeSuggestions(inspected) {
        var tagName = inspected.tagName;

        if (!tagName) {
            return;
        }

        var markoMajorVersion = this.markoMajorVersion;
        if (markoMajorVersion == null || markoMajorVersion >= 3) {
            this.taglibLookup.forEachAttribute(tagName, (attr, tag) => {
                if (attr.deprecated || attr.name === '*' || attr.name.startsWith('_')) {
                    return;
                }

                if (this.shouldAllowSuggestion(attr.name)) {
                    this.addCustomAttrSuggestion(attr, tag, inspected);
                }
            });
        }
    }


    addAttributeValueSuggestions(inspected) {
        var tagName = inspected.tagName;
        var attributeName = inspected.attributeName;

        var attr = this.taglibLookup.getAttribute(tagName, attributeName);
        if (attr && attr.enum) {
            attr.enum.forEach((valueOption) => {
                if (typeof valueOption === 'string') {
                    valueOption = {
                        value: valueOption
                    };
                }

                this.addSuggestion(Object.assign({
                    text: valueOption.value,
                    type: 'value'
                }, valueOption));
            });
        }
    }

    addTagAutocompleteSuggestions(autocomplete, suggestion, tagName, openTagOnly) {
        var inspected = this.inspected;


        var handleSuggestion = (curSuggestion) => {
            var mergedSuggestion = Object.assign({
                    sortText: tagName
                }, suggestion, curSuggestion);

            var snippet = curSuggestion.snippet;
            if (snippet) {
                if (!curSuggestion.displayText) {
                    mergedSuggestion.displayText = getDisplayTextForSnippet(snippet);
                }
            } else {
                mergedSuggestion.snippet = tagName;
                mergedSuggestion.displayText = tagName;
            }

            if (mergedSuggestion.snippet) {
                if (!inspected.concise && inspected.shouldCompleteEndingTag) {
                    if (openTagOnly || mergedSuggestion.openTagOnly) {
                        mergedSuggestion.snippet = mergedSuggestion.snippet + '${99} />';
                    } else {
                        mergedSuggestion.snippet = mergedSuggestion.snippet + '${98}>${99}</' + tagName + '>';
                    }
                }

                mergedSuggestion.snippet = mergedSuggestion.snippet + '${100}';
            }

            this.addSuggestion(mergedSuggestion);
        };

        if (Array.isArray(autocomplete)) {
            autocomplete.forEach(handleSuggestion);
        } else {
            handleSuggestion(autocomplete);
        }
    }

    addCustomTagSuggestion(tag, inspected) {
        var tagName = tag.name;

        var suggestion = {
            text: tagName,
            sortText: tagName,
            displayText: tagName,
            type: 'tag',
            description: tag.html ? "HTML <" + tagName + "> tag" : "Custom Marko <" + tagName + "> tag"
        };

        var taglibPath = tag.taglibId || tag.taglibPath;
        if (taglibPath) {
            suggestion.rightLabel = getTaglibLabel(taglibPath);
        }

        let autocomplete = tag.autocomplete;

        if (autocomplete) {
            this.addTagAutocompleteSuggestions(autocomplete, suggestion, tagName, tag.openTagOnly);
        } else {
            if (inspected.shouldCompleteEndingTag) {
                if (inspected.concise !== true) {
                    if (tag.openTagOnly) {
                        suggestion.snippet = tagName + '${1} />${2}';
                    } else {
                        suggestion.snippet = tagName + '${1}>${2}</' + tagName + '>${3}';
                    }
                }
            }

            this.addSuggestion(suggestion);
        }
    }

    addCustomAttrSuggestion(attr, tag, inspected) {
        let attrName = attr.name;

        let suggestion = {
            text: attrName,
            displayText: attrName,
            type: 'attribute',
            description: attr.html ? "HTML attribute: " + attrName : "Custom Marko attribute: " + attrName,
            sortPriority: tag.name === '*' ? SORT_PRIORITY_GLOBAL : SORT_PRIORITY_LOCAL,
            leftLabel: attr.type
        };

        let taglibPath = tag.filePath || tag.taglibId || tag.taglibPath;
        if (taglibPath) {
            suggestion.rightLabel = getTaglibLabel(taglibPath);
        }

        let autocomplete = attr.autocomplete;

        if (autocomplete) {
            if (!Array.isArray(autocomplete)) {
                autocomplete = [autocomplete];
            }

            autocomplete.forEach((curSuggestion) => {
                let mergedSuggestion = Object.assign({}, suggestion, curSuggestion);

                let snippet = curSuggestion.snippet;
                if (snippet && !curSuggestion.displayText) {
                    mergedSuggestion.displayText = getDisplayTextForSnippet(snippet);
                }

                if (mergedSuggestion.snippet) {
                    // Always let the user tab to the position at the position after the attribute
                    mergedSuggestion.snippet += '${99}';
                    mergedSuggestion.sortText = attrName; // Use the attribute name for sorting purposes
                }

                this.addSuggestion(mergedSuggestion);
            });

            return;
        } else {
            if (inspected.shouldCompleteAttributeValue !== false) {
                if (attr.enum) {
                    suggestion.snippet = attrName + "=\"$1\"$0";
                    suggestion.triggerAutocompleteAfterInsert = true;
                } else {
                    if (attr.type === 'string') {
                        suggestion.snippet = attrName + "=\"$1\"";
                    } else {
                        suggestion.snippet = attrName + "=$0";
                    }
                }
            } else {
                if (suggestion.snippet) {
                    suggestion.snippet += '${99}';
                }
            }

            this.addSuggestion(suggestion);
        }
    }

    getTagDocsURL(tag) {
        return "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/" + tag;
    }
}

module.exports = SuggestionsBuilder;