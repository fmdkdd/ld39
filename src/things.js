// A thing occupies a cell
class Thing {

  constructor(name) {
    if (!name) throw new Error('name was not specified');
    this.name = name;
  }

  render(dt) {
  }

}

Thing.ID = 0;

class Consumer extends Thing {

  // size: how much power it consumes
  constructor(size) {
    super(`consumer-${Thing.ID++}`);
    if (size <= 0) throw new Error('size must be > 0');
    this.size = size;
  }

}

class Obstacle extends Thing {

  constructor() {
    super(`obstacle-${Thing.ID++}`);
  }

}

class Generator extends Thing {

  constructor(name) {
    super(name);
    this.rotation = Generator.Rotation.TOP;
  }

  rotate() {
    this.rotation = (this.rotation + 1) % 4;

    dispatch('thing rotated', {thing: this});
  }

  rotationAsRadian() {
    let r = this.rotation;
    switch (r) {
    case Generator.Rotation.TOP: return 0;
    case Generator.Rotation.RIGHT: return Math.PI/2;
    case Generator.Rotation.BOTTOM: return Math.PI;
    case Generator.Rotation.LEFT: return 3*Math.PI/2;
    default:
      throw new Error("Non-exhaustive switch");
    }
  }

}

Generator.Type = {
  WindTurbine: 0,
  SolarPanel: 1,
  Battery: 2,
}

Generator.Rotation = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3,
};

class Pattern {
  // Return a list of the cells:
  // X.....
  // where X is at [ox,oy], and there are as many dots as length-1 (X is
  // included in the list).  Adjusted for rotation.
  static straightLineFrom(x,y, rotation, length) {
    let cells = [];

    let dx = 0;
    let dy = 0;

    switch (rotation) {
    case Generator.Rotation.TOP:    dy = +1; break;
    case Generator.Rotation.RIGHT:  dx = +1; break;
    case Generator.Rotation.BOTTOM: dy = -1; break;
    case Generator.Rotation.LEFT:   dx = -1; break;
    }

    for (let i = 0; i < length; ++i) {
      cells.push([x, y]);
      x += dx;
      y += dy;
    }

    return cells;
  }

  // Return a list of the cells:
  //      .
  //     .X.
  //      .
  // including X.
  static crossCenteredAt(x,y) {
    return [
      [x,y],
      [x+1,y],
      [x-1,y],
      [x,y+1],
      [x,y-1],
    ];
  }
}

class WindTurbine extends Generator {

  constructor() {
    super(`windturbine-${Thing.ID++}`);
  }

  // Return a list of all the cells that may be powered by this generator
  // (positioned at [ox,oy]), as [x,y] coordinates
  getPoweredCells(ox,oy, night) {

    let length = night ? 3 : 5;

    // Cast a line from the origin
    let cells = Pattern.straightLineFrom(ox,oy, this.rotation, length);

    // Discard the first cell, since it's where the turbine stands and does not
    // emit power
    cells.shift();

    return cells;
  }

  // Distribute power in a straight line starting from the turbine position
  distributeDayPower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy, false).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer ||
            thing instanceof Battery) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

  // Distribute power in a straight line starting from the turbine position
  distributeNightPower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy, true).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

  render(dt) {
    this.model.getObjectByName('blades').rotation.y += dt * 0.5;
  }
}


class SolarPanel extends Generator {

  constructor() {
    super(`solarpanel-${Thing.ID++}`);

    this.rotation = Generator.Rotation.TOP;
  }

  // Return a list of all the cells that may be powered by this generator
  // (positioned at [ox,oy]), as [x,y] coordinates
  getPoweredCells(ox,oy, night) {
    let cells = Pattern.crossCenteredAt(ox,oy);

    // At night, remove two opposite cells, depending on rotation
    if (night) {
      if (this.rotation % 2) {
        cells.splice(1,2);
      } else {
        cells.splice(3,2);
      }
    }

    return cells;
  }

  distributeDayPower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy,false).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer ||
          thing instanceof Battery) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

  distributeNightPower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy,true).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

  rotate() {
    // Only two variations for solar panels
    this.rotation = this.rotation === Generator.Rotation.TOP ?
      Generator.Rotation.RIGHT : Generator.Rotation.TOP;

    dispatch('thing rotated', {thing: this});
  }

}

class Battery extends Generator {

  constructor() {
    super(`battery-${Thing.ID++}`);
  }

  getPoweredCells() {
    // no coverage
    return []
  }

  distributeDayPower(level, counters) {
    // No power to distribute during the day
  }

  distributeNightPower(level, counters) {
    // Distribute power to all connected components of neighboring
    // consumer, but only if the battery is powered during the day.

    let [ox,oy] = level.getThingXY(this);

    // Collect all neighbors that are next to this battery, or that are next to
    // a neighbor that's next to this battery, etc.
    let neighbors = connectedComponents(ox,oy,level);

    // Match the power distribution
    neighbors.forEach(c => {
      counters.set(c, c.size);
    });
  }
}

function connectedComponents(x,y, level) {
  // Locations (x,y) to visit
  let queue = [];
  // Already seen locations
  let seen = new Set();
  let consumers = [];

  // Start by searching around (x,y)
  queue.push.apply(queue, neighborsOf(x,y));

  while (queue.length > 0) {
    let [x,y] = queue.shift();

    // HACK: Set can do equality of array [x,y],
    // so we convert to unique value
    if (seen.has(y * 1000 + x)) {
      continue;
    }

    if (!level.inBounds(x,y)) {
      continue;
    }

    let thing = level.getThingAt(x,y);

    if (thing instanceof Consumer) {
      consumers.push(thing);
      queue.push.apply(queue, neighborsOf(x,y));
    }

    seen.add(y * 1000 + x);
  }

  return consumers;
}

function neighborsOf(x,y) {
  return [[x+1,y],
          [x-1,y],
          [x,y+1],
          [x,y-1]];
}
