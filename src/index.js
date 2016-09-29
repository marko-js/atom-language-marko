'use strict';

const CompositeDisposable = require('atom').CompositeDisposable;
const tagMatching = require('./tag-matching');
const autocompleteProvider = require('./autocomplete/provider');
const hyperclickProvider = require('./hyperclick/provider');
const path = require('path');
const markoCompilerUtil = require('./util/markoCompiler');

module.exports = {
    subscriptions: null,

    activate(state) {
        autocompleteProvider.onActivate();
        
        this.subscriptions = new CompositeDisposable();

        function handleEditorSave(event) {
            let filePath = event.path;
            if (filePath) {
                let filename = path.basename(filePath);
                if (filename === 'marko-tag.json' ||
                    filename === 'marko.json' ||
                    filename === 'package.json' ||
                    filename === 'template.marko' ||
                    filename === 'renderer.js') {
                    markoCompilerUtil.clearCache();
                }
            }
        }

        this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
            editor.onDidSave(handleEditorSave);

            var editorScopes = editor.getRootScopeDescriptor().getScopesArray();

            if (!editorScopes || !editorScopes.length) {
                return;
            }

            if (editorScopes[0] !== 'text.marko') {
                return;
            }

            tagMatching.begin(editor);
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    getAutocompleteProvider() {
        return autocompleteProvider;
    },

    getHyperclickProvider() {
        return hyperclickProvider;
    }
};