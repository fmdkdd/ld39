// A playable level loaded from static data
class Level {

  // Populate the grid from the given string level data
  constructor(data) {
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

    dispatch('init terrain', {width, height});

    // Map from things to their position in the grid
    this.things = new Map();

    for (let y=0; y < lines.length; ++y) {
      let row = lines[y];
      for (let x=0; x < row.length; ++x) {
        let col = row[x];
        switch (col) {
          // floor (skip)
        case '.': break;

          // obstacle
        case '#': this.putThingAt(new Obstacle(), x,y); break;

          // consumer
        case '1': case '2': case '3': case '4':
          let size = parseInt(col, 10);
          this.putThingAt(new Consumer(size), x,y);
          break;

        case 'W': this.putThingAt(new WindTurbine(), x,y); break;
        case 'S': this.putThingAt(new SolarPanel(), x,y); break;
        case 'B': this.putThingAt(new Battery(), x,y); break;

        default:
          throw new Error(`Unrecognized level symbol: '${col}'`);
        }
      }
    }

    this.hasNight = !!data.hasNight;
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

    // Signal thing has moved
    dispatch('level put thing', {thing, pos: [x,y]});
  }

  // Whether [x,y] is in the level bounds
  inBounds(x,y) {
    return this.grid.inBounds(x,y);
  }

  getThingAt(x,y) {
    return this.grid.getAt(x,y);
  }

  // Return coordinates (x,y) of Thing in level, or throw if it's not in the level
  getThingXY(thing) {
    if (!this.hasThing(thing)) throw new Error(`Thing ${thing.name} not in level`);
    let [x,y] = this.things.get(thing);
    return [x,y];
  }

  // Return whether this grid has a cell with this thing
  hasThing(thing) {
    return this.things.has(thing);
  }

  // Replace the thing in the level by the replacement thing
  replaceThingBy(thing, replacement) {
    let [x,y] = this.getThingXY(thing);
    this.removeThing(thing);
    this.putThingAt(replacement, x,y);
  }

  removeThing(thing) {
    if (!this.hasThing(thing)) throw new Error(`Thing ${thing.name} not in level`);
    let [x,y] = this.things.get(thing);
    this.grid.putAt(null, x,y);
    this.things.delete(thing);

    dispatch('level removed thing', {thing, pos: [x,y]});
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

    let day_counter = new Map();
    let night_counter = new Map();
    for (let th of this.things.keys()) {
      if (th instanceof Consumer) {
        day_counter.set(th, 0);
        night_counter.set(th, 0);
      }
      else if (th instanceof Battery) {
        day_counter.set(th, 0);
      }
    }

    // Distribute day power to consurmers and batteries
    for (let th of this.things.keys()) {
      if (th instanceof WindTurbine ||
          th instanceof SolarPanel) {
        th.distributeDayPower(this, day_counter);
      }
    }

    // batteries don't distribute power in the day

    // Distribute night power
    if (this.hasNight) {

      // Distribute power from the turbines and panels first,
      // since the batteries will distribute the remaining power.
      for (let th of this.things.keys()) {
        if (th instanceof WindTurbine ||
            th instanceof SolarPanel) {
          th.distributeNightPower(this, night_counter);
        }
      }

      // Distribute power from powered batteries
      for (let th of this.things.keys()) {
        if (th instanceof Battery) {
          let powered = day_counter.get(th) > 0;
          if (powered) {
            th.distributeNightPower(this, night_counter);
          }
        }
      }
    }

    // Gather any mispowered (unpowered/overloaded) consumer or battery, with
    // the current value
    let mispowered_day = collectMispowered(day_counter);

    // If there are no mispowered consumers, the level is solved!
    let solved = true;
    for (let {thing} of mispowered_day) {
      if (thing instanceof Consumer) {
        solved = false;
        break;
      }
    }

    // If it's a night level, check there are no unpowered night consumers
    let mispowered_night = [];
    if (this.hasNight) {
      mispowered_night = collectMispowered(night_counter);

      for (let {thing} of mispowered_night) {
        if (thing instanceof Consumer) {
          solved = false;
          break;
        }
      }
    }

    return {solved, mispowered_day, mispowered_night};
  }

}

function collectMispowered(counter) {
  let mispowered = [];
  for (let [thing, power] of counter.entries()) {
    if (thing instanceof Consumer) {
      if (thing.size !== power) {
        mispowered.push({thing, current_power: power});
      }
    } else if (thing instanceof Battery) {
      if (power === 0) {
        mispowered.push({thing, current_power: power});
      }
    }
  }
  return mispowered;
}
