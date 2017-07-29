// Implements controls bound to the GUI
class GameController {

  constructor(level) {
    if (!level) throw new Error('Level is undefined');
    this.level = level;
    this.heldItem = null;
  }

  // Take generator from inventory and put it in the currently held slot
  pickUpFromInventory(item) {
    this.level.markUnavailable(item);
    this.heldItem = item.type;
  }

  // Put held item back in inventory.  Do nothing if we have no held item.
  releaseHeldItem() {
    if (this.heldItem) {
      this.level.markAvailable(this.heldItem);
      this.heldItem = null;
    }
  }

  // Put the held item at (x,y) in the level.  Do nothing if we have no held item.
  putHeldItemAt(x,y) {
    if (this.heldItem) {
      this.level.putThingAt(Generator.buildFromType(this.heldItem), x,y);
      this.heldItem = null;
    }
  }

  // Take generator from level and put it in the currently held slot.
  // If we are currently holding an item, swap them instead.
  pickUpThing(thing) {
    if (this.heldItem) {
      this.level.replaceThingBy(thing, Generator.buildFromType(this.heldItem));
    } else {
      this.level.removeThing(thing);
      this.heldItem = thing;
    }
  }

  // Take generator at (x,y) in level and put it in the currently held slot
  pickUpThingFromXY(x,y) {
    this.pickUpThing(this.level.getThingAt(x,y));
  }

}
