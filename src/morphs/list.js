
// ListMorph ///////////////////////////////////////////////////////////

ListMorph.prototype = new ScrollFrameMorph();
ListMorph.prototype.constructor = ListMorph;
ListMorph.uber = ScrollFrameMorph.prototype;

function ListMorph(elements, labelGetter, format, doubleClickAction) {
    /*
        passing a format is optional. If the format parameter is specified
        it has to be of the following pattern:

            [
                [<color>, <single-argument predicate>],
                ['bold', <single-argument predicate>],
                ['italic', <single-argument predicate>],
                ...
            ]

        multiple conditions can be passed in such a format list, the
        last predicate to evaluate true when given the list element sets
        the given format category (color, bold, italic).
        If no condition is met, the default format (color black, non-bold,
        non-italic) will be assigned.

        An example of how to use fomats can be found in the InspectorMorph's
        "markOwnProperties" mechanism.
    */
    this.init(
        elements || [],
        labelGetter || function (element) {
            if (isString(element)) {
                return element;
            }
            if (element.toSource) {
                return element.toSource();
            }
            return element.toString();
        },
        format || [],
        doubleClickAction // optional callback
    );
}

ListMorph.prototype.init = function (
    elements,
    labelGetter,
    format,
    doubleClickAction
) {
    ListMorph.uber.init.call(this);

    this.contents.acceptsDrops = false;
    this.color = new Color(255, 255, 255);
    this.hBar.alpha = 0.6;
    this.vBar.alpha = 0.6;
    this.elements = elements || [];
    this.labelGetter = labelGetter;
    this.format = format;
    this.listContents = null;
    this.selected = null; // actual element currently selected
    this.active = null; // menu item representing the selected element
    this.action = null;
    this.doubleClickAction = doubleClickAction || null;
    this.acceptsDrops = false;
    this.buildListContents();
};

ListMorph.prototype.buildListContents = function () {
    var myself = this;
    if (this.listContents) {
        this.listContents.destroy();
    }
    this.listContents = new MenuMorph(
        this.select,
        null,
        this
    );
    if (this.elements.length === 0) {
        this.elements = ['(empty)'];
    }
    this.elements.forEach(function (element) {
        var color = null,
            bold = false,
            italic = false;

        myself.format.forEach(function (pair) {
            if (pair[1].call(null, element)) {
                if (pair[0] === 'bold') {
                    bold = true;
                } else if (pair[0] === 'italic') {
                    italic = true;
                } else { // assume it's a color
                    color = pair[0];
                }
            }
        });
        myself.listContents.addItem(
            myself.labelGetter(element), // label string
            element, // action
            null, // hint
            color,
            bold,
            italic,
            myself.doubleClickAction
        );
    });
    this.listContents.isListContents = true;
    this.listContents.drawNew();
    this.listContents.setPosition(this.contents.position());
    this.addContents(this.listContents);
};

ListMorph.prototype.select = function (item, trigger) {
    if (isNil(item)) {
        return;
    }
    this.selected = item;
    this.active = trigger;
    if (this.action) {
        this.action.call(null, item);
    }
};

ListMorph.prototype.setExtent = function (aPoint) {
    var lb = this.listContents.bounds,
        nb = this.bounds.origin.copy().corner(
            this.bounds.origin.add(aPoint)
        );

    if (nb.right() > lb.right() && nb.width() <= lb.width()) {
        this.listContents.setRight(nb.right());
    }
    if (nb.bottom() > lb.bottom() && nb.height() <= lb.height()) {
        this.listContents.setBottom(nb.bottom());
    }
    ListMorph.uber.setExtent.call(this, aPoint);
};

ListMorph.prototype.activeIndex = function () {
    return this.listContents.children.indexOf(this.active);
};

ListMorph.prototype.activateIndex = function (idx) {
    var item = this.listContents.children[idx];
    if (!item) {
        return;
    }
    item.image = item.pressImage;
    item.changed();
    item.trigger();
};
