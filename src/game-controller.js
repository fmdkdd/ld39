// Implements controls bound to the GUI
class GameController {

  constructor(app) {
    if (!app) throw new Error('App is undefined');
    this.app = app;
    this.game = new Game(this.app);
    this.heldThing = null;
    this.currentLevel = 0;
  }

  loadLevel(num) {
    if (this.level) {
      this.game.unloadLevel(this.level);
    }
    this.level = new Level(LEVELS[num]);
    this.currentLevel = num;
    this.game.loadLevel(this.level);
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
  pickUpThingAt(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing) {
      this.pickUpThing(thing);
    }
  }

  clickAt(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing) {
      this.pickUpThing(thing);
    } else {
      this.putHeldThingAt(x,y);
    }
  }

  pointermove(pointer) {

    let tile = this.game.pickGridTile(pointer);

    if (tile) {
      // Restore the color of the previously hovered tile
      this.game.updateTileColor(this.hoveredTile, false);

      // Highlight the hovered tile
      this.hoveredTile = tile;
      this.game.updateTileColor(this.hoveredTile, true);
    } else {
      // No tile, unhlighlight
      this.game.updateTileColor(this.hoveredTile, false);
      this.hoveredTile = null;
    }
  }

  pointerdown() {
    if (this.hoveredTile) {
      let [x,y] = this.hoveredTile.coords;
      console.log(`Picking grid cell (${x},${y})`);

      this.clickAt(x,y);
      console.log('Thing held: ', this.heldThing);
    }
  }

  render(dt) {
    if (this.level) {
      for (let [thing,_] of this.level.things)
        thing.render(dt);
    }

    this.game.render(dt);

    // Day view
    this.app.renderer.setViewport(0, 0, 160, 180);
		this.app.renderer.setScissor(0, 0, 160, 180);
		this.app.renderer.setScissorTest(true);
		this.app.renderer.setClearColor(DAY_CLEARCOLOR);

    this.app.renderer.render(this.game.scene, this.game.camera);

    // Night view
    this.app.renderer.setViewport(160, 0, 160, 180);
		this.app.renderer.setScissor(160, 0, 160, 180);
		this.app.renderer.setScissorTest(true);
		this.app.renderer.setClearColor(NIGHT_CLEARCOLOR);

    this.app.renderer.render(this.game.scene, this.game.camera);
  }

}
