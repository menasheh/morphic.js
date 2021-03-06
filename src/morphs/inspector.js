// InspectorMorph: referenced constructors

var ListMorph;
var TriggerMorph;

// InspectorMorph inherits from BoxMorph:

InspectorMorph.prototype = new BoxMorph();
InspectorMorph.prototype.constructor = InspectorMorph;
InspectorMorph.uber = BoxMorph.prototype;

// InspectorMorph instance creation:

function InspectorMorph(target) {
    this.init(target);
}

InspectorMorph.prototype.init = function (target) {
    // additional properties:
    this.target = target;
    this.currentProperty = null;
    this.showing = 'attributes';
    this.markOwnProperties = false;
    this.hasUserEditedDetails = false;

    // initialize inherited properties:
    InspectorMorph.uber.init.call(this);

    // override inherited properties:
    this.silentSetExtent(
        new Point(
            MorphicPreferences.handleSize * 20,
            MorphicPreferences.handleSize * 20 * 2 / 3
        )
    );
    this.isDraggable = true;
    this.border = 1;
    this.edge = MorphicPreferences.isFlat ? 1 : 5;
    this.color = new Color(60, 60, 60);
    this.borderColor = new Color(95, 95, 95);
    this.fps = 25;
    this.drawNew();

    // panes:
    this.label = null;
    this.list = null;
    this.detail = null;
    this.work = null;
    this.buttonInspect = null;
    this.buttonClose = null;
    this.buttonSubset = null;
    this.buttonEdit = null;
    this.resizer = null;

    if (this.target) {
        this.buildPanes();
    }
};

InspectorMorph.prototype.setTarget = function (target) {
    this.target = target;
    this.currentProperty = null;
    this.buildPanes();
};

InspectorMorph.prototype.updateCurrentSelection = function () {
    var val, txt, cnts,
        sel = this.list.selected,
        currentTxt = this.detail.contents.children[0],
        root = this.root();

    if (root &&
        (root.keyboardReceiver instanceof CursorMorph) &&
        (root.keyboardReceiver.target === currentTxt)) {
        this.hasUserEditedDetails = true;
        return;
    }
    if (isNil(sel) || this.hasUserEditedDetails) {
        return;
    }
    val = this.target[sel];
    this.currentProperty = val;
    if (isNil(val)) {
        txt = 'NULL';
    } else if (isString(val)) {
        txt = val;
    } else {
        txt = val.toString();
    }
    if (currentTxt.text === txt) {
        return;
    }
    cnts = new TextMorph(txt);
    cnts.isEditable = true;
    cnts.enableSelecting();
    cnts.setReceiver(this.target);
    this.detail.setContents(cnts);
};

InspectorMorph.prototype.buildPanes = function () {
    var attribs = [], property, myself = this, ctrl, ev, doubleClickAction;

    // remove existing panes
    this.children.forEach(function (m) {
        if (m !== this.work) { // keep work pane around
            m.destroy();
        }
    });
    this.children = [];

    // label
    this.label = new TextMorph(this.target.toString());
    this.label.fontSize = MorphicPreferences.menuFontSize;
    this.label.isBold = true;
    this.label.color = new Color(255, 255, 255);
    this.label.drawNew();
    this.add(this.label);

    // properties list
    for (property in this.target) {
        if (property) { // dummy condition, to be refined
            attribs.push(property);
        }
    }
    if (this.showing === 'attributes') {
        attribs = attribs.filter(function (prop) {
            return typeof myself.target[prop] !== 'function';
        });
    } else if (this.showing === 'methods') {
        attribs = attribs.filter(function (prop) {
            return typeof myself.target[prop] === 'function';
        });
    } // otherwise show all properties

    doubleClickAction = function () {
        var world, inspector;
        if (!isObject(myself.currentProperty)) {
            return;
        }
        world = myself.world();
        inspector = new InspectorMorph(
            myself.currentProperty
        );
        inspector.setPosition(world.hand.position());
        inspector.keepWithin(world);
        world.add(inspector);
        inspector.changed();
    };

    this.list = new ListMorph(
        this.target instanceof Array ? attribs : attribs.sort(),
        null, // label getter
        this.markOwnProperties ?
            [ // format list
                [ // format element: [color, predicate(element]
                    new Color(0, 0, 180),
                    function (element) {
                        return Object.prototype.hasOwnProperty.call(
                            myself.target,
                            element
                        );
                    }
                ]
            ]
            : null,
        doubleClickAction
    );

    this.list.action = function () {
        myself.hasUserEditedDetails = false;
        myself.updateCurrentSelection();
    };

    this.list.hBar.alpha = 0.6;
    this.list.vBar.alpha = 0.6;
    this.list.contents.step = null;
    this.add(this.list);

    // details pane
    this.detail = new ScrollFrameMorph();
    this.detail.acceptsDrops = false;
    this.detail.contents.acceptsDrops = false;
    this.detail.isTextLineWrapping = true;
    this.detail.color = new Color(255, 255, 255);
    this.detail.hBar.alpha = 0.6;
    this.detail.vBar.alpha = 0.6;
    ctrl = new TextMorph('');
    ctrl.isEditable = true;
    ctrl.enableSelecting();
    ctrl.setReceiver(this.target);
    this.detail.setContents(ctrl);
    this.add(this.detail);

    // work ('evaluation') pane
    // don't refresh the work pane if it already exists
    if (this.work === null) {
        this.work = new ScrollFrameMorph();
        this.work.acceptsDrops = false;
        this.work.contents.acceptsDrops = false;
        this.work.isTextLineWrapping = true;
        this.work.color = new Color(255, 255, 255);
        this.work.hBar.alpha = 0.6;
        this.work.vBar.alpha = 0.6;
        ev = new TextMorph('');
        ev.isEditable = true;
        ev.enableSelecting();
        ev.setReceiver(this.target);
        this.work.setContents(ev);
    }
    this.add(this.work);

    // properties button
    this.buttonSubset = new TriggerMorph();
    this.buttonSubset.labelString = 'show...';
    this.buttonSubset.action = function () {
        var menu;
        menu = new MenuMorph();
        menu.addItem(
            'attributes',
            function () {
                myself.showing = 'attributes';
                myself.buildPanes();
            }
        );
        menu.addItem(
            'methods',
            function () {
                myself.showing = 'methods';
                myself.buildPanes();
            }
        );
        menu.addItem(
            'all',
            function () {
                myself.showing = 'all';
                myself.buildPanes();
            }
        );
        menu.addLine();
        menu.addItem(
            (myself.markOwnProperties ?
                'un-mark own' : 'mark own'),
            function () {
                myself.markOwnProperties = !myself.markOwnProperties;
                myself.buildPanes();
            },
            'highlight\n\'own\' properties'
        );
        menu.popUpAtHand(myself.world());
    };
    this.add(this.buttonSubset);

    // inspect button
    this.buttonInspect = new TriggerMorph();
    this.buttonInspect.labelString = 'inspect...';
    this.buttonInspect.action = function () {
        var menu, world, inspector;
        if (isObject(myself.currentProperty)) {
            menu = new MenuMorph();
            menu.addItem(
                'in new inspector...',
                function () {
                    world = myself.world();
                    inspector = new InspectorMorph(
                        myself.currentProperty
                    );
                    inspector.setPosition(world.hand.position());
                    inspector.keepWithin(world);
                    world.add(inspector);
                    inspector.changed();
                }
            );
            menu.addItem(
                'here...',
                function () {
                    myself.setTarget(myself.currentProperty);
                }
            );
            menu.popUpAtHand(myself.world());
        } else {
            myself.inform(
                (myself.currentProperty === null ?
                    'null' : typeof myself.currentProperty) +
                '\nis not inspectable'
            );
        }
    };
    this.add(this.buttonInspect);

    // edit button

    this.buttonEdit = new TriggerMorph();
    this.buttonEdit.labelString = 'edit...';
    this.buttonEdit.action = function () {
        var menu;
        menu = new MenuMorph(myself);
        menu.addItem("save", 'save', 'accept changes');
        menu.addLine();
        menu.addItem("add property...", 'addProperty');
        menu.addItem("rename...", 'renameProperty');
        menu.addItem("remove...", 'removeProperty');
        menu.popUpAtHand(myself.world());
    };
    this.add(this.buttonEdit);

    // close button
    this.buttonClose = new TriggerMorph();
    this.buttonClose.labelString = 'close';
    this.buttonClose.action = function () {
        myself.destroy();
    };
    this.add(this.buttonClose);

    // resizer
    this.resizer = new HandleMorph(
        this,
        150,
        100,
        this.edge,
        this.edge
    );

    // update layout
    this.fixLayout();
};

InspectorMorph.prototype.fixLayout = function () {
    var x, y, r, b, w, h;

    Morph.prototype.trackChanges = false;

    // label
    x = this.left() + this.edge;
    y = this.top() + this.edge;
    r = this.right() - this.edge;
    w = r - x;
    this.label.setPosition(new Point(x, y));
    this.label.setWidth(w);
    if (this.label.height() > (this.height() - 50)) {
        this.silentSetHeight(this.label.height() + 50);
        this.drawNew();
        this.changed();
        this.resizer.drawNew();
    }

    // list
    y = this.label.bottom() + 2;
    w = Math.min(
        Math.floor(this.width() / 3),
        this.list.listContents.width()
    );

    w -= this.edge;
    b = this.bottom() - (2 * this.edge) -
        MorphicPreferences.handleSize;
    h = b - y;
    this.list.setPosition(new Point(x, y));
    this.list.setExtent(new Point(w, h));

    // detail
    x = this.list.right() + this.edge;
    r = this.right() - this.edge;
    w = r - x;
    this.detail.setPosition(new Point(x, y));
    this.detail.setExtent(new Point(w, (h * 2 / 3) - this.edge));

    // work
    y = this.detail.bottom() + this.edge;
    this.work.setPosition(new Point(x, y));
    this.work.setExtent(new Point(w, h / 3));

    // properties button
    x = this.list.left();
    y = this.list.bottom() + this.edge;
    w = this.list.width();
    h = MorphicPreferences.handleSize;
    this.buttonSubset.setPosition(new Point(x, y));
    this.buttonSubset.setExtent(new Point(w, h));

    // inspect button
    x = this.detail.left();
    w = this.detail.width() - this.edge -
        MorphicPreferences.handleSize;
    w = w / 3 - this.edge / 3;
    this.buttonInspect.setPosition(new Point(x, y));
    this.buttonInspect.setExtent(new Point(w, h));

    // edit button
    x = this.buttonInspect.right() + this.edge;
    this.buttonEdit.setPosition(new Point(x, y));
    this.buttonEdit.setExtent(new Point(w, h));

    // close button
    x = this.buttonEdit.right() + this.edge;
    r = this.detail.right() - this.edge -
        MorphicPreferences.handleSize;
    w = r - x;
    this.buttonClose.setPosition(new Point(x, y));
    this.buttonClose.setExtent(new Point(w, h));

    Morph.prototype.trackChanges = true;
    this.changed();

};

InspectorMorph.prototype.setExtent = function (aPoint) {
    InspectorMorph.uber.setExtent.call(this, aPoint);
    this.fixLayout();
};

// InspectorMorph editing ops:

InspectorMorph.prototype.save = function () {
    var txt = this.detail.contents.children[0].text.toString(),
        prop = this.list.selected;
    try {
        // this.target[prop] = evaluate(txt);
        this.target.evaluateString('this.' + prop + ' = ' + txt);
        this.hasUserEditedDetails = false;
        if (this.target.drawNew) {
            this.target.changed();
            this.target.drawNew();
            this.target.changed();
        }
    } catch (err) {
        this.inform(err);
    }
};

InspectorMorph.prototype.addProperty = function () {
    var myself = this;
    this.prompt(
        'new property name:',
        function (prop) {
            if (prop) {
                myself.target[prop] = null;
                myself.buildPanes();
                if (myself.target.drawNew) {
                    myself.target.changed();
                    myself.target.drawNew();
                    myself.target.changed();
                }
            }
        },
        this,
        'property' // Chrome cannot handle empty strings (others do)
    );
};

InspectorMorph.prototype.renameProperty = function () {
    var myself = this,
        propertyName = this.list.selected;
    this.prompt(
        'property name:',
        function (prop) {
            try {
                delete (myself.target[propertyName]);
                myself.target[prop] = myself.currentProperty;
            } catch (err) {
                myself.inform(err);
            }
            myself.buildPanes();
            if (myself.target.drawNew) {
                myself.target.changed();
                myself.target.drawNew();
                myself.target.changed();
            }
        },
        this,
        propertyName
    );
};

InspectorMorph.prototype.removeProperty = function () {
    var prop = this.list.selected;
    try {
        delete (this.target[prop]);
        this.currentProperty = null;
        this.buildPanes();
        if (this.target.drawNew) {
            this.target.changed();
            this.target.drawNew();
            this.target.changed();
        }
    } catch (err) {
        this.inform(err);
    }
};

// InspectorMorph stepping

InspectorMorph.prototype.step = function () {
    this.updateCurrentSelection();
    var lbl = this.target.toString();
    if (this.label.text === lbl) {
        return;
    }
    this.label.text = lbl;
    this.label.drawNew();
    this.fixLayout();
};

// InspectorMorph duplicating:

InspectorMorph.prototype.updateReferences = function (map) {
    var active = this.list.activeIndex();
    InspectorMorph.uber.updateReferences.call(this, map);
    this.buildPanes();
    this.list.activateIndex(active);
};
