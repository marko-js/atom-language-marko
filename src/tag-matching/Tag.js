'use strict';

class Tag {
    constructor(tagNameRange, range, isOpenTag, isSelfClosedTag, editor) {
        this.isOpenTag = isOpenTag;
        this.isSelfClosedTag = isSelfClosedTag;
        this.editor = editor;

        this.tagNameMarker = tagNameRange ? editor.markBufferRange(tagNameRange) : null;

        this.marker = editor.markBufferRange(range);
    }

    containsCursor(cursorPos) {
        return this.marker.getBufferRange().containsPoint(cursorPos);
    }

    tagNameContainsCursor(cursorPos) {
        return this.tagNameMarker ? this.tagNameMarker.getBufferRange().containsPoint(cursorPos) : false;
    }

    highlight() {
        this.editor.decorateMarker(this.marker, {
            type: 'highlight',
            class: 'bracket-matcher',
            deprecatedRegionClass: 'bracket-matcher'
        });
    }

    unhighlight() {
        var editor = this.editor;
        editor.destroyMarker(this.marker.id);
    }

    get tagName() {
        if (!this.tagNameMarker) {
            return;
        }

        return this.editor.getTextInBufferRange(this.tagNameMarker.getBufferRange());
    }

    set tagName(value) {
        this.editor.setTextInBufferRange(this.tagNameMarker.getBufferRange(), value);
    }

    get range() {
        return this.marker.getBufferRange();
    }

    get tagNameRange() {
        return this.tagNameMarker ? this.tagNameMarker.getBufferRange() : null;
    }
}

module.exports = Tag;