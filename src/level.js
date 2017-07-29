// Represents generators available for each level
class InventoryItem {

  constructor(type) {
    if (type == null) throw new Error('InventoryItem type is undefined');
    this.type = type;
    this.available = true;
  }

  instantiate() {
    return new this.type();
  }

}

// A playable level loaded from static data
class Level {

  // Populate the grid from the given string level data
  constructor(data) {
    // Parse generators
    if (!data.generators) throw new Error('Empty generators');
    this.inventory = Array.prototype.map.call(data.generators, (g => {
      switch (g) {
      case 'W': return new InventoryItem(WindTurbine);
      case 'S': return new InventoryItem(SolarPanel);
      case 'B': return new InventoryItem(Battery);
      default:
        throw new Error(`Unrecognized generator symbol: '${g}'`);
      }
    }));

    // Parse map
    let lines = data.map
        .replace(/ /g, '')  // remove any space used for alignment
        .split('\n');
    let height = lines.length;
    if (height == 0) throw new Error('Empty level');
    // Assume width from the first line
    let width = lines[0].length;
    if (width == 0) throw new Error('Empty level');

    this.grid = new Grid(width, height);
    // Map from things to their position in the grid
    this.things = new Map();

    for (let y=0; y < lines.length; ++y) {
      let row = lines[y];
      for (let x=0; x < row.length; ++x) {
        let col = row[x];
        switch (col) {
          // floor (skip)
        case '.':
          break;

          // obstacle
        case '#':
          this.putThingAt(new Obstacle(), x,y);
          break;

          // consumer
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          let size = parseInt(col, 10);
          this.putThingAt(new Consumer(size), x,y);
          break;

        default:
          throw new Error(`Unrecognized level symbol: '${col}'`);
        }
      }
    }
  }

  putThingAt(thing, x,y) {
    // Can't replace existing things without removing them first
    if (this.getThingAt(x,y) != null) {
      throw new Error("There's already a thing at (x,y)");
    }

    // If the thing we want to add was already in this level, remove it
    if (this.things.has(thing)) {
      this.removeThing(thing);
    }

    this.grid.putAt(thing, x,y);
    this.things.set(thing, [x,y]);
  }

  getThingAt(x,y) {
    return this.grid.getAt(x,y);
  }

  // Return coordinates (x,y) of Thing in level, or throw if it's not in the level
  getThingXY(thing) {
    if (!this.hasThing(thing)) throw new Error('Thing ${thing.name} not in level');
    let [x,y] = this.things.get(thing);
    return [x,y];
  }

  // Return whether this grid has a cell with this thing
  hasThing(thing) {
    return this.things.has(thing);
  }

  // Replace the thing in the level by the replacement thing
  replaceThing(thing, replacement) {
    let [x,y] = this.getThingXY(thing);
    this.removeThing(thing);
    this.putThingAt(replacement, x,y);
  }

  removeThing(thing) {
    if (!this.hasThing(thing)) throw new Error('Thing ${thing.name} not in level');
    let [x,y] = this.things.get(thing);
    this.grid.putAt(null, x,y);
  }

  // Mark inventory item as unavailable
  markUnavailable(item) {
    item.available = false;
  }

  // Mark the first inventory item that matches thing's type as available
  markAvailable(thing) {
    let item = this.inventory.find(item => item.type == thing.constructor);
    if (!item) throw new Error("Thing is not allowed in the level inventory");
    item.available = true;
  }

  // Validate this level: try to distribute power from generators to consumers.
  //
  // Return a validation object describing the current state of the level:
  // solved, or unsolved with a list of consumers that are unpowered or overloaded.
  validate() {
    // Create a power counter for each consumer, then go through each generator,
    // apply power to its area, incrementing the counter if a consumer is found.
    // In the end, we compare the power counter to the consumer size, and report
    // any discrepancy.

    let counters = new Map();
    for (let th of this.things.keys()) {
      if (th instanceof Consumer) {
        counters.set(th, 0);
      }
    }

    for (let th of this.things.keys()) {
      if (th instanceof Generator) {
        // Let the generator add to the power counters
        th.distributePower(this, counters);
      }
    }

    // Gather any mispowered (unpowered/overloaded) consumer, with the current
    // value
    let mispowered = [];
    for (let [counter, power] of counters.entries()) {
      if (counter.size !== power) {
        mispowered.push({counter, current_power: power});
      }
    }
    // If there are no mispowered consumers, the level is solved!
    let solved = mispowered.length === 0;

    return {solved, mispowered};
  }

}
