const legacyMarkoWidgetsEventAttrRegExp = /^w-on/;
const eventAttrRegExp = /^on/;
const initStateRegExp = /this\.state\s*[=]/g;
const getTemplateDataRegExp = /getTemplateData/g;

const path = require('path');
const fs = require('fs');
const lassoPackageRoot = require('lasso-package-root');
const resolveFrom = require('resolve-from');
const Inspector = require('./Inspector');
const escapeStringRegexp = require('escape-string-regexp');
const markoUtil = require('../util/marko');

const TAG_PATH_PROPS = [
    'renderer',
    'template',
    'codeGeneratorModulePath',
    'nodeFactoryPath',
    'transformer',
    'filePath'
];

function getDefaultDir() {
    let project = atom.project;
    let directories = project.getDirectories();
    if (directories && directories.length) {
        return directories[0].getPath();
    }
    return __dirname;
}

function isMarkoEditor(textEditor) {
        let scopeName = textEditor.getGrammar().scopeName;
        return scopeName === 'text.marko' || scopeName === 'source.marko';
}

function isMarkoWidgetsEventAttr(inspected) {
    let attrName = inspected.attributeName;
    if (!attrName) {
        return false;
    }
    let attrValue = inspected.literalValue;
    if (!attrValue || typeof attrValue !== 'string') {
        return false;
    }

    if (inspected.attributeHasArgument) {
        return eventAttrRegExp.test(attrName);
    } else {
        legacyMarkoWidgetsEventAttrRegExp.test(attrName);
    }
}

function resolveFilePath(inspected, textEditor) {
    let filePath = inspected.literalValue;
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }

    let editorFilePath = textEditor.getPath();

    if (!editorFilePath) {
        return;
    }

    // See if the "path" resolves to a file relative to
    // the directory assocaited with the editor
    let dir = path.dirname(editorFilePath);
    let resolvedPath = resolveFrom(dir, filePath);
    if (resolvedPath) {
        return resolvedPath;
    }

    // See if the path resolves relative to the root directory of
    // the project
    dir = lassoPackageRoot.getRootDir(dir);

    if (filePath.charAt(0) !== '.') {
        filePath = './' + filePath;
        resolvedPath = resolveFrom(dir, filePath);
        if (resolvedPath) {
            return resolvedPath;
        }
    }

    return null;
}

var widgetFiles = ['component.js', 'widget.js', 'index.js'];

function getWidgetFilePath(textEditor) {
    let editorFilePath = textEditor.getPath();
    let dir = path.dirname(editorFilePath);

    for (var i=0; i<widgetFiles.length; i++) {
        var pathToTest = path.join(dir, widgetFiles[i]);
        if (fs.existsSync(pathToTest)) {
            return pathToTest;
        }
    }

    return textEditor.getPath();
}

function getTaglibLookup(textEditor) {
    let filePath = textEditor.getPath();
    let dir;

    let markoCompiler;

    if (filePath) {
        dir = path.dirname(filePath);
        markoCompiler = markoUtil.loadMarkoCompiler(dir);
    } else {
        dir = getDefaultDir();
        markoCompiler = markoUtil.defaultMarkoCompiler;
    }

    let taglibLookup = markoCompiler.buildTaglibLookup(dir);

    return taglibLookup;
}

function getTagFile(tagDef) {
    for (let propName of TAG_PATH_PROPS) {
        let propValue = tagDef[propName];
        if (propValue) {
            if (typeof propValue === 'string') {
                return propValue;
            } else {
                return propValue.path || propValue.filePath;
            }
        }
    }
}

function openFile(path) {
    return atom.workspace.open(path)
        .then((textEditor) => {
            let view = atom.views.getView(textEditor);
            atom.commands.dispatch(view, 'tree-view:reveal-active-file');
            view.focus();
            return textEditor;
        });
}

function scanToTag(textEditor, tagName) {
    tagName = escapeStringRegexp(tagName);

    var found = null;
    textEditor.scan(new RegExp("<" + tagName + '>', "g"), (result) => {
        found = result;
        result.stop();
    });

    if (!found) {
        textEditor.scan(new RegExp('"' + tagName + '"', "g"), (result) => {
            found = result;
            result.stop();
        });
    }

    return found;
}

function scanToAttribute(textEditor, attrName, range) {
    attrName = escapeStringRegexp(attrName);

    var found = null;
    textEditor.scanInBufferRange(new RegExp("@" + attrName, "g"), range, (result) => {
        found = result;
        result.stop();
    });

    if (!found) {
        textEditor.scan(new RegExp('"' + attrName + '"', "g"), range, (result) => {
            textEditor.setCursorBufferPosition(result.range.start);
            found = result;
            result.stop();
        });
    }

    return found;
}

function openAttributeFile(attrDef, tagName) {
    let filePath = attrDef.filePath;

    return openFile(filePath)
        .then((textEditor) => {
            let attrName = escapeStringRegexp(attrDef.name);

            var tagMatch = scanToTag(textEditor, tagName);
            if (!tagMatch) {
                tagMatch = scanToTag(textEditor, '*');
            }

            let attrScanRange;

            if (tagMatch) {
                attrScanRange = [tagMatch.range.end, textEditor.getBuffer().getEndPosition()];
            } else {
                attrScanRange = textEditor.getBuffer().getRange();
            }

            var attrMatch = scanToAttribute(textEditor, attrName, attrScanRange);

            if (attrMatch) {
                textEditor.setCursorBufferPosition(attrMatch.range.start);
            } else if (tagMatch) {
                textEditor.setCursorBufferPosition(tagMatch.range.start);
            }
        });
}

function openMarkoWidgetsEventHandler(filePath, handlerName) {
    return openFile(filePath)
        .then((textEditor) => {
            textEditor.scan(new RegExp(`${handlerName}\\s*[(]|${handlerName}\\s*[:]`, "g"), (result) => {
                textEditor.setCursorBufferPosition(result.range.start);
                result.stop();
            });
        });
}

function openStateInit(filePath) {
    return openFile(filePath)
        .then((textEditor) => {
            textEditor.scan(initStateRegExp, (result) => {
                textEditor.setCursorBufferPosition(result.range.start);
                result.stop();
            });
        });
}

function openGetTemplateData(filePath) {
    return openFile(filePath)
        .then((textEditor) => {
            textEditor.scan(getTemplateDataRegExp, (result) => {
                textEditor.setCursorBufferPosition(result.range.start);
                result.stop();
            });
        });
}

let provider = {
    providerName: "hyperclick-marko",
    wordRegExp: /'(?:[^']|\\')*'|"(?:[^"]|\\")*"|[a-zA-Z0-9.\-:.]+(\s*\()?/g,
    getSuggestionForWord(textEditor, text, range) {
        if (!isMarkoEditor(textEditor)) {
            return;
        }

        let inspector = new Inspector(textEditor, text, range);
        let inspected = inspector.inspect();
        let filePath;

        if (!inspected) {
            return;
        }

        if (isMarkoWidgetsEventAttr(inspected)) {
            // The user clicked on the attribute value for a Marko Widgets event attribute.
            // For example: w-onClick="handleClick"
            //
            // We want to take the user to the "handleClick" method in the widget file
            let handlerName = inspected.literalValue;
            let widgetFilePath = getWidgetFilePath(textEditor);
            if (!widgetFilePath) {
                return;
            }

            return {
                range,
                callback() {
                    openMarkoWidgetsEventHandler(widgetFilePath, handlerName);
                }
            };
        } else if ((filePath = resolveFilePath(inspected, textEditor))) {
            // The user clicked on a string that appears to be a path since
            // it resolved to a file that exists
            return {
                range,
                callback() {
                    openFile(filePath);
                }
            };
        } else if (inspected.attributeName && inspected.tagName) {
            // The user clicked on an attribute name. This may be
            // a custom attribute and we would want to take the user
            // to where the custom attribute is defined
            let taglibLookup = getTaglibLookup(textEditor);
            if (!taglibLookup) {
                return;
            }

            let tagName = inspected.tagName;
            let attrName = inspected.attributeName;

            let attrDef = taglibLookup.getAttribute(tagName, attrName);
            if (!attrDef || !attrDef.filePath) {
                return;
            }

            return {
                range,
                callback() {
                    openAttributeFile(attrDef, tagName);
                }
            };
        } else if (inspected.tagName) {
            // The user clicked on an tag name. This may be
            // a custom tag and we would want to take the user
            // to where the custom tag is implemented
            let taglibLookup = getTaglibLookup(textEditor);
            if (!taglibLookup) {
                return;
            }

            let tagDef = taglibLookup.getTag(inspected.tagName);

            if (!tagDef) {
                return;
            }

            let tagFile = getTagFile(tagDef);

            if (!tagFile) {
                return;
            }

            return {
                range,
                callback() {
                    openFile(tagFile);
                }
            };
        } else if (inspected.stateVar) {
            let widgetFilePath = getWidgetFilePath(textEditor);
            if (!widgetFilePath) {
                return;
            }

            return {
                range,
                callback() {
                    openStateInit(widgetFilePath);
                }
            };
        } else if (inspected.dataVar) {
            let widgetFilePath = getWidgetFilePath(textEditor);
            if (!widgetFilePath) {
                return;
            }

            return {
                range,
                callback() {
                    openGetTemplateData(widgetFilePath);
                }
            };
        }
    }
};

module.exports = provider;