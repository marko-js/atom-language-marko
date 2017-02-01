'use strict';

const CompositeDisposable = require('atom').CompositeDisposable;
const tagMatching = require('./tag-matching');
const autocompleteProvider = require('./autocomplete/provider');
const hyperclickProvider = require('./hyperclick/provider');
const path = require('path');
const markoUtil = require('./util/marko');
const markoPrettyprint = require('marko-prettyprint');
const getProjectDir = require('./util/project').getProjectDir;

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
                    markoUtil.clearCache();
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


        atom.commands.add(
            'atom-workspace',
            'language-marko:prettyprint',
            function prettyprintCommand(event) {
                var editor = atom.workspace.getActiveTextEditor();
                if (!editor) {
                    return;
                }

                var grammar = editor.getGrammar().scopeName;
                if (grammar !== 'text.marko') {
                    return;
                }

                var editorFile = editor.getPath();

                var projectDir = getProjectDir();
                if (!editorFile) {
                    editorFile = path.join(projectDir, 'template.marko');
                }

                var source = editor.getText();
                var prettySource = markoPrettyprint.prettyPrintSource(source, { filename: editorFile });
                editor.setText(prettySource);
            });

        atom.commands.add(
            '.tree-view .file .name[data-name$=\\.marko]',
            'language-marko:prettyprint',
            function prettyprintTreeViewItem(event) {
                console.log('Event:', event);
                let target = event.target;
                let filePath = target.dataset.path;
                markoPrettyprint.prettyPrintFile(filePath);
            });

        return Promise.resolve()
            .then(() => {
                return require('atom-package-deps').install('language-marko');
            })
            .catch((e) => {
                console.log(e);
            });
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
