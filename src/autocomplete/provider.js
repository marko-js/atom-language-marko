// TODO:
// - Show right label for taglib JSON file
// - Show left label for attribute type
// - Add snippets for Marko Widgets
// - Add snippets for lasso

var SuggestionsBuilder = require('./SuggestionsBuilder');

module.exports = {
    selector: '.text.marko',
    inclusionPriority: 100,
    suggestionPriority: 999,
    disableForSelector: '.text.marko .comment',
    filterSuggestions: false,

    getSuggestions: function(request) {
        var suggestionsBuilder = new SuggestionsBuilder(request);
        var suggestions = suggestionsBuilder.getSuggestions();
        return suggestions;
    },

    onDidInsertSuggestion: function(request) {
        var editor = request.editor;
        var suggestion = request.suggestion;
        var triggerAutocompleteAfterInsert = suggestion.triggerAutocompleteAfterInsert || suggestion.triggerAutocomplete;

        if (triggerAutocompleteAfterInsert) {
            return setTimeout(this.triggerAutocomplete.bind(this, editor), 1);
        }
    },
    triggerAutocomplete: function(editor) {
        return atom.commands.dispatch(atom.views.getView(editor), 'autocomplete-plus:activate', {
            activatedManually: false
        });
    },
    onActivate: function() {
        return Promise.resolve();
    }
};