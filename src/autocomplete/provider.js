// TODO:
// - Show right label for taglib JSON file
// - Show left label for attribute type
// - Add snippets for Marko Widgets
// - Add snippets for lasso
var path = require('path');
var fs = require('fs');
var SuggestionsBuilder = require('./SuggestionsBuilder');

var htmlTags = {
    tags: {},
    attributes: {}
};

var series = require('raptor-async/series');

module.exports = {
    selector: '.text.marko',
    inclusionPriority: 100,
    suggestionPriority: 999,
    disableForSelector: '.text.marko .comment',
    filterSuggestions: false,

    getSuggestions: function(request) {
        var suggestionsBuilder = new SuggestionsBuilder(request, htmlTags);
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
        series([
                function(callback) {
                    fs.readFile(path.join(__dirname, '../../html-tags-generated.json'), function(err, content) {
                        if (err) {
                            return callback(err);
                        }
                        Object.assign(htmlTags, JSON.parse(content));
                        callback();
                    });
                },
                function(callback) {
                    fs.readFile(path.join(__dirname, '../../html-tags.json'), function(err, content) {
                        if (err) {
                            return callback(err);
                        }
                        var htmlTagsExtended = JSON.parse(content);
                        for (var tagName in htmlTagsExtended) {
                            var tagInfo = htmlTagsExtended[tagName];
                            var targetTagInfo = htmlTags.tags[tagName] || (htmlTags.tags[tagName] = {});
                            Object.assign(targetTagInfo, tagInfo);
                        }

                        callback();
                    });
                }
            ],
            function(err) {
                if (err) {
                    throw err;
                }
            });

        return Promise.resolve();
    }
};