// A thing occupies a cell
class Thing {

  constructor(name) {
    if (!name) throw new Error('name was not specified');
    this.name = name;
  }

  render(dt) {
    this.model.getObjectByName('motor').rotation.y += dt * 0.5;
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
    // TODO: night
    const length = 5;

    // Cast a line from the origin
    let cells = Pattern.straightLineFrom(ox,oy, this.rotation, length);

    // Discard the first cell, since it's where the turbine stands and does not
    // emit power
    cells.shift();

    return cells;
  }

  // Distribute power in a straight line starting from the turbine position
  distributePower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

  render(dt) {
  }
}


class SolarPanel extends Generator {

  constructor() {
    super(`solarpanel-${Thing.ID++}`);
  }

  // Return a list of all the cells that may be powered by this generator
  // (positioned at [ox,oy]), as [x,y] coordinates
  getPoweredCells(ox,oy, night) {
    let cells = Pattern.crossCenteredAt(ox, oy);

    // TODO: night

    return cells;
  }

  // Distribute power in a straight line starting from the turbine position
  distributePower(level, counters) {
    let [ox,oy] = level.getThingXY(this);

    // If there is a consumer in a powered cell, add to its counter
    this.getPoweredCells(ox,oy).forEach(([x,y]) => {
      if (level.inBounds(x,y)) {
        let thing = level.getThingAt(x, y);
        if (thing instanceof Consumer) {
          counters.set(thing, counters.get(thing) + 1);
        }
      }
    });
  }

}

class Battery extends Generator {

  constructor() {
    super(`battery-${Thing.ID++}`);
  }

}
