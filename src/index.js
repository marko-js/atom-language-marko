'use strict';

var CompositeDisposable = require('atom').CompositeDisposable;
var tagMatching = require('./tag-matching');

module.exports = {
    subscriptions: null,

    activate(state) {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
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
    }
};