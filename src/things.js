// A thing occupies a cell
class Thing {

  constructor(name) {
    if (!name) throw new Error('name was not specified');
    this.name = name;
  }

}

class Consumer extends Thing {

  // size: how much power it consumes
  constructor(name, size) {
    super(name);
    if (size <= 0) throw new Error('size must be > 0');
    this.size = size;
  }

}

class Obstacle extends Thing {

  constructor(name) {
    super(name);
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

  constructor(name) {
    super(name);
    this.rotation = WindTurbine.Rotation.HORIZONTAL;
  }

}

WindTurbine.Rotation = {
  HORIZONTAL: 0,
  VERTICAL: 1,
};

class SolarPanel extends Generator {

  constructor(name) {
    super(name);
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

  constructor(name) {
    super(name);
  }

}
