// Represents generators available for each level
class InventoryItem {

  constructor(type) {
    if (type == null) throw new Error('InventoryItem type is undefined');
    this.type = type;
    this.available = true;
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
      case 'W': return new InventoryItem(Generator.Type.WindTurbine);
      case 'S': return new InventoryItem(Generator.Type.SolarPanel);
      case 'B': return new InventoryItem(Generator.Type.Battery);
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

    let id = 0;
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
          this.putThingAt(new Obstacle(`obstacle-${id}`), x,y);
          id++;
          break;

          // consumer
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          let size = parseInt(col, 10);
          this.putThingAt(new Consumer(`consumer-${id}`, size), x,y);
          id++;
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
      let [x,y] = this.things.get(thing);
      this.grid.putAt(null, x,y);
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
    let pos = this.things.get(thing);
    let y = Math.floor(pos / this.width);
    let x = pos - y;
    return [x,y];
  }

  // Return whether this grid has a cell with this thing
  hasThing(thing) {
    return this.things.has(thing);
  }

}
