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

class WindTurbine extends Generator {

  constructor() {
    super(`windturbine-${Thing.ID++}`);
  }
  }

  render(dt) {
  }
}


class SolarPanel extends Generator {

  constructor() {
    super(`solarpanel-${Thing.ID++}`);
  }

}

    // TODO: night

class Battery extends Generator {

  constructor() {
    super(`battery-${Thing.ID++}`);
  }

}
