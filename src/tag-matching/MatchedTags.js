'use strict';
var simpleTagName = /^[@a-zA-Z0-9\-:]+$/;

class MatchedTags {
    constructor(openTag, closeTag, activeTag) {
        this.openTag = openTag;
        this.closeTag = closeTag;
        this.activeTag = activeTag;
    }

    containsCursor(cursorPos) {
        if (this.openTag.containsCursor(cursorPos)) {
            return true;
        }

        if (this.closeTag && this.closeTag.containsCursor(cursorPos)) {
            return true;
        }

        return false;
    }

    get inactiveTag() {
        if (this.openTag === this.activeTag) {
            return this.closeTag;
        } else {
            return this.openTag;
        }
    }

    swapActiveTag() {
        var inactiveTag = this.inactiveTag;
        if (inactiveTag) {
            this.activeTag = inactiveTag;
        }
    }

    isValid() {
        if (this.openTag && !this.openTag.isValid()) {
            return false;
        }

        if (this.closeTag && !this.closeTag.isValid()) {
            return false;
        }

        return true;
    }

    highlight(editor) {
        this.openTag.highlight(editor);
        if (this.closeTag) {
            this.closeTag.highlight(editor);
        }
    }

    unhighlight(editor) {
        this.openTag.unhighlight(editor);
        if (this.closeTag) {
            this.closeTag.unhighlight(editor);
        }
    }

    synchronizeTagName(editor) {
        if (!this.closeTag || editor.hasMultipleCursors()) {
            // There is only an open tag
            return false;
        }

        var fromTag;
        var toTag;

        if (this.activeTag === this.openTag) {
            fromTag = this.openTag;
            toTag = this.closeTag;
        } else {
            fromTag = this.closeTag;
            toTag = this.openTag;
        }

        var fromTagName = fromTag.tagName;
        var toTagName = toTag.tagName;

        if (toTagName != null && fromTagName !== toTagName) {
            if ((fromTagName === '' || simpleTagName.test(fromTagName)) && fromTag.isValid() && toTag.isValid()) {
                // Adjust the ranges based
                toTag.tagName = fromTagName;

                setTimeout(function() {
                    atom.commands.dispatch(atom.views.getView(editor), 'autocomplete-plus:activate', {
                        activatedManually: false
                    });
                }, 1);

                return true;
            }
        }

        return false;
    }
}

module.exports = MatchedTags;