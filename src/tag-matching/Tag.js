'use strict';

const decorateOptions = {
    type: 'highlight',
    class: 'bracket-matcher',
    deprecatedRegionClass: 'bracket-matcher'
};

class Tag {
    constructor(tagNameRange, range, isOpenTag, isSelfClosedTag, editor) {
        this.isOpenTag = isOpenTag;
        this.isSelfClosedTag = isSelfClosedTag;
        this.editor = editor;

        this.tagNameMarker = tagNameRange ? editor.markBufferRange(tagNameRange) : null;

        this.marker = range ? editor.markBufferRange(range) : range;
    }

    containsCursor(cursorPos) {
        return this.marker.getBufferRange().containsPoint(cursorPos);
    }

    tagNameContainsCursor(cursorPos) {
        return this.tagNameMarker ? this.tagNameMarker.getBufferRange().containsPoint(cursorPos) : false;
    }

    highlight() {
        var tagName = this.tagName;
        if (tagName) {
            this.editor.decorateMarker(this.tagNameMarker, decorateOptions);
        } else if (this.marker) {
            this.editor.decorateMarker(this.marker, decorateOptions);
        }


    }

    unhighlight() {
        var editor = this.editor;

        if (this.marker) {
            editor.destroyMarker(this.marker.id);
        }

        if (this.tagNameMarker) {
            editor.destroyMarker(this.tagNameMarker.id);
        }
    }

    get tagName() {
        if (!this.tagNameMarker) {
            return;
        }

        return this.editor.getTextInBufferRange(this.tagNameMarker.getBufferRange());
    }

    set tagName(value) {
        this.editor.setTextInBufferRange(this.tagNameMarker.getBufferRange(), value, {
            undo: 'skip'
        });
    }

    get range() {
        return this.marker && this.marker.getBufferRange();
    }

    get tagNameRange() {
        return this.tagNameMarker ? this.tagNameMarker.getBufferRange() : null;
    }

    get tagHtml() {
        if (!this.marker) {
            return '';
        }

        return this.editor.getTextInBufferRange(this.marker.getBufferRange());
    }

    isValid() {
        var tagHtml = this.tagHtml;
        if (tagHtml.startsWith('<') && tagHtml.endsWith('>')) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = Tag;