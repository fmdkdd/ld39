// Implements controls bound to the GUI
class GameController {

  constructor(level) {
    if (!level) throw new Error('Level is undefined');
    this.level = level;
    this.heldThing = null;
  }

  // Take generator from inventory and put it in the currently held slot
  pickUpFromInventory(item) {
    this.level.markUnavailable(item);
    this.heldThing = item.instantiate();
  }

  // Put held item back in inventory.  Do nothing if we have no held item.
  releaseHeldThing() {
    if (this.heldThing) {
      this.level.markAvailable(this.heldThing);
      this.heldThing = null;
    }
  }

  // Put the held item at (x,y) in the level.  Do nothing if we have no held item.
  putHeldThingAt(x,y) {
    if (this.heldThing) {
      this.level.putThingAt(this.heldThing, x,y);
      this.heldThing = null;
    }
  }

  // Take generator from level and put it in the currently held slot.
  // If we are currently holding an item, swap them instead.
  pickUpThing(thing) {
    if (this.heldThing) {
      this.level.replaceThingBy(thing, this.heldThing);
    } else {
      this.level.removeThing(thing);
    }
    this.heldThing = thing;
  }

  // Take generator at (x,y) in level and put it in the currently held slot
  // Do nothing if there is nothing at (x,y).
  pickUpThingFromXY(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing) {
      this.pickUpThing(thing);
    }
  }

  clickAtXY(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing) {
      this.pickUpThing(thing);
    } else {
      this.putHeldThingAt(x,y);
    }
  }

}
