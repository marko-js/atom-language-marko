'use strict';

const TagMatcher = require('./TagMatcher');

function begin(editor) {
    var tagMatcher = new TagMatcher(editor);
    tagMatcher.beginWatching();
}

exports.begin = begin;