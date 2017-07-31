// Implements controls bound to the GUI
class GameController {

  constructor(app) {
    if (!app) throw new Error('App is undefined');
    this.app = app;
    this.game = new Game(this.app);
    this.heldThing = null;
    this.currentLevel = 0;
    this.currentLevelSolved = false;

    document.addEventListener('level put thing', ev => this.validate());
    document.addEventListener('level removed thing', ev => this.validate());
    document.addEventListener('thing rotated', ev => {
      this.validate();

      let {thing} = ev.detail;

      // Make sure to rotate the thing's model and not the root
      thing.model.getObjectByName('model').rotation.y = thing.rotationAsRadian();

      if (thing instanceof Generator)
      {
        let pos;
        if (thing === this.heldThing) {
          // Rotating in hand, use hoverTile coords, or the last tile that was
          // picked (to handle rotating when outside of the board)
          if (this.hoveredTile) {
            pos = this.hoveredTile.coords;
          } else if (this.lastPickedTile) {
            pos = this.lastPickedTile.coords;
          }
        } else {
          pos = this.level.getThingXY(thing);
        }

        this.heldThingPos = pos;
      }
    });

    document.getElementById('next-level').addEventListener('mousedown', ev => {
      if (ev.button === 0) {
        this.nextLevel();
      }
      ev.preventDefault(); // prevent drag and dropping the image
    });
  }

  loadLevel(num) {
    if (this.level) {
      this.game.unloadLevel(this.level);
    }
    this.level = new Level(LEVELS[num]);
    this.currentLevel = num;
    this.currentLevelSolved = false;
    this.heldThing = null;
    this.game.loadLevel(this.level);
    this.game.hideNextLevelButton();
    this.validate();
  }

  // Proceed to next level, or to exit screen
  nextLevel() {
    const next = this.currentLevel + 1;
    if (next < LEVELS.length) {
      // TODO: smooth transition?
      this.loadLevel(next);
    } else {
      // TODO: No more levels, exit screen?
    }
  }

  validate() {
    if (this.level) {
      this.validationResult = this.level.validate();

      if (this.validationResult.solved) {
        // once you've solved it once, that's enough
        this.currentLevelSolved = true;

        // The level is solved, offer to proceed to next level
        this.game.showNextLevelButton();
      }
    }
  }

  // Put the held item at (x,y) in the level.  Do nothing if we have no held item.
  putHeldThingAt(x,y) {
    if (this.heldThing) {
      this.level.putThingAt(this.heldThing, x,y);
      this.heldThing = null;

      this.game.putParticleCloud(x, y);
    }
  }

  // Take generator from level and put it in the currently held slot.
  // If we are currently holding an item, swap them instead.
  pickUpThing(thing) {

    if (!(thing instanceof Generator)) {
      return;
    }

    let thingPos = this.level.getThingXY(thing);

    if (this.heldThing) {
      this.level.replaceThingBy(thing, this.heldThing);
    } else {
      this.level.removeThing(thing);
    }
    this.heldThing = thing;
    this.heldThingPos = thingPos;

    // keep the model visible even though it has been removed from the logic grid
    this.heldThing.model.visible = true;
  }

  // Take generator at (x,y) in level and put it in the currently held slot
  // Do nothing if there is nothing at (x,y).
  pickUpThingAt(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing && thing instanceof Generator) {
      this.pickUpThing(thing);
    }
  }

  rotateThingAt(x,y) {
    let thing = this.level.getThingAt(x,y);

    if (thing instanceof WindTurbine ||
        thing instanceof SolarPanel) {
      thing.rotate();
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

    this.game.updatePicking(pointer, this.level.hasNight);

    let tile = this.game.pickGridTile();

    if (tile) {
      this.lastPickedTile = tile;

      // Restore the color of the previously hovered tile
      this.game.updateTileColor(this.hoveredTile, false);

      // Don't highlight tiles with consumer on them
      let thing = this.level.getThingAt(tile.coords[0], tile.coords[1]);
      if (!(thing instanceof Consumer || thing instanceof Obstacle)) {
        // Highlight the hovered tile
        this.hoveredTile = tile;
        this.game.updateTileColor(this.hoveredTile, true);
      }

      // If we are holding something, keep it under the cursor
      if (this.heldThing) {
        this.game.moveThingAt(this.heldThing, tile.coords);
        this.heldThingPos = tile.coords;
      }

    } else {
      // No tile, unhighlight
      this.game.updateTileColor(this.hoveredTile, false);
      this.hoveredTile = null;
    }

    // Highlight hovered generators
    let generator = this.game.pickGenerator();
    if (generator) {

      if (generator != this.highlightedThing) {
        this.game.highlightThing(this.highlightedThing, false);
        this.highlightedThing = generator;
        this.game.highlightThing(this.highlightedThing, true);
      }
    } else {
      this.game.highlightThing(this.highlightedThing, false);
      this.highlightedThing = null;
    }
  }

  leftclick() {
    if (this.hoveredTile) {
      let [x,y] = this.hoveredTile.coords;
      this.clickAt(x,y);
    }
  }

  rightclick() {
    if (this.hoveredTile) {
      let [x,y] = this.hoveredTile.coords;
      this.rotateThingAt(x,y);
    }

    if (this.heldThing) {
      this.heldThing.rotate();
    }
  }

  validationFeedback(mispowered) {
    // Clear previous outlines
    for (let [thing, _] of this.level.things)
      this.game.clearOutline(thing);

    for (let [thing, pos] of this.level.things) {
      if (thing instanceof Consumer || thing instanceof Battery) {

        const isMispowered = mispowered.some(m => m.thing === thing);

        this.game.outlineThing(thing, !isMispowered);
      }
    }
  }

  rebuildCoverage(night) {
    for (let [th,pos] of this.level.things.entries()) {
      const visible = th === this.highlightedThing && th instanceof Generator;
      this.game.updateCoverage(th, pos, visible, night);
    }
    if (this.heldThing) {
      this.game.updateCoverage(this.heldThing, this.heldThingPos, true, false);
    }
  }

  setupDayScene(dt) {
    // Visual feedback for mispowered cells
    this.validationFeedback(this.validationResult.mispowered_day);

    // Build coverage for day
    this.rebuildCoverage(false);

    // Cosmetics
    this.game.ambientLight.visible = true;
    this.game.dayLight.visible = true;
    this.game.nightLight.visible = false;

    // Type-specific rendering
    if (this.level) {
      for (let [thing,_] of this.level.things)
        thing.render(dt, true);
    }
  }

  setupNightScene(dt) {
    // Visual feedback for mispowered cells
    this.validationFeedback(this.validationResult.mispowered_night);

    // Build coverage for day
    this.rebuildCoverage(true);

    // Cosmetics
    this.game.nightLight.visible = true;
    this.game.ambientLight.visible = false;
    this.game.dayLight.visible = false;

    // Type-specific rendering
    if (this.level) {
      for (let [thing,_] of this.level.things)
        thing.render(dt, false);
    }
  }

  render(dt) {

    this.game.render(dt);

    let width = this.app.width;
    let height = this.app.height;
    let frustrum = 1;

    if (this.level.hasNight) {
      width /= 2;
      frustrum = 1.5;
    }

    let aspect = width / height;

    let left = -frustrum * aspect / 2;
    let right = frustrum * aspect / 2;
    let top = frustrum / 2;
    let bottom = -frustrum / 2;

    this.game.camera.left = left;
    this.game.camera.right = right;
    this.game.camera.top = top;
    this.game.camera.bottom = bottom;
    this.game.camera.updateProjectionMatrix();

    // Day view
    this.app.renderer.setViewport(0, 0, width, height);
    this.app.renderer.setScissor(0, 0, width, height);
    this.app.renderer.setScissorTest(true);
    this.app.renderer.setClearColor(DAY_CLEARCOLOR, 1);

    this.setupDayScene(dt);

    this.game.composer.render(dt);

    if (this.level.hasNight) {
      // Night view
      this.app.renderer.setViewport(width, 0, width, this.app.height);
      this.app.renderer.setScissor(width, 0, width, this.app.height);
      this.app.renderer.setScissorTest(true);
      this.app.renderer.setClearColor(NIGHT_CLEARCOLOR, 1);

      this.setupNightScene(dt);

      //this.app.renderer.render(this.game.scene, this.game.camera);
      this.game.composer.render(dt);
    }
  }

}
