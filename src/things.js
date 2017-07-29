// A thing occupies a cell
class Thing {

  constructor(name) {
    if (!name) throw new Error('name was not specified');
    this.name = name;
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

  static buildFromType(type) {
    switch (type) {
    case Generator.Type.WindTurbine:
      return new WindTurbine();
    case Generator.Type.SolarPanel:
      return new SolarPanel();
    case Generator.Type.Battery:
      return new Battery();
    default:
      throw new Error(`Unknown item type: '${type}'`);
    }
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
