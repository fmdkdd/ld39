// A thing occupies a cell
class Thing {

  constructor(name) {
    if (!name) throw new Error('name was not specified');
    this.name = name;
  }

  render(dt) {
    console.log(this.model.getObjectByName('motor').rotation);
    this.model.getObjectByName('motor').rotation.y += dt * 0.5;
    console.log(this.model.getObjectByName('motor').rotation);
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
  }

}

Generator.Type = {
  WindTurbine: 0,
  SolarPanel: 1,
  Battery: 2,
}

class WindTurbine extends Generator {

  constructor() {
    super(`windturbine-${Thing.ID++}`);
    this.rotation = WindTurbine.Rotation.HORIZONTAL;
  }

  render(dt) {
  }
}

WindTurbine.Rotation = {
  HORIZONTAL: 0,
  VERTICAL: 1,
};

class SolarPanel extends Generator {

  constructor() {
    super(`solarpanel-${Thing.ID++}`);
    this.rotation = SolarPanel.Rotation.TOP;
  }

}

SolarPanel.Rotation = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3,
};

class Battery extends Generator {

  constructor() {
    super(`battery-${Thing.ID++}`);
  }

}
