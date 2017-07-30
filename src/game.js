// https://stackoverflow.com/questions/16357384/three-js-load-multiple-separated-objects-jsonloader/39402449#39402449
function loadModel(json)
{
  const loader = new THREE.ObjectLoader();
  const model = loader.parse(json);

  // Use vertex colors + Lambert shading + shadow
  model.traverse(child => {
    child.material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
    child.castShadow = true;
  });

  return model;
}

function dispatch(eventName, detail = null) {
  document.dispatchEvent(new CustomEvent(eventName, {detail}))
}

function isGenerator(object)
{
  do {
    if (object.thing instanceof Generator)
      return true;

    object = object.parent;
  } while(object.parent);

  return false;
}

function isInInventory(object)
{
  do {
    if (object.inventory)
      return true;

    object = object.parent;
  } while(object.parent);

  return false;
}

const TILE_SIZE = 0.2;
const TILE_COLOR_1 = 0x6daa2c;
const TILE_COLOR_2 = 0x79a92b;
const TILE_COLOR_HOVER = 0x96a82a;

const ModelTypes = {
  Terrain: 0,
};

class Game
{
  constructor(app)
  {
    this.app = app;

    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();

    const aspect = app.width / app.height;
    const frustrum = 1;
    this.camera = new THREE.OrthographicCamera(-frustrum*aspect/2, frustrum*aspect/2, frustrum/2, -frustrum/2, 0.1, 100 );
    this.camera.position.set(0, 2, 2);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);

    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    this.dirLight.position.set(4, 3, 4);
    this.dirLight.castShadow = true;
    this.scene.add(this.dirLight);
    // Lighter shadows:
    // https://stackoverflow.com/questions/40938238/shadow-darkness-in-threejs-and-object-opacity

    document.addEventListener('level put thing', ev => {
      let {thing, pos} = ev.detail;
      if (thing.model) {
        const modelPos = this.gridToWorld(pos[0], pos[1]);
        thing.model.position.set(modelPos[0], 0, modelPos[1]);
        thing.model.visible = true;
      }
    });

    document.addEventListener('level removed thing', ev => {
      let thing = ev.detail.thing;
      if (thing.model) {
        thing.model.visible = false;
      }
    });
  }

  unloadLevel(level) {
    // Remove all objects from the previous level, if any
    for (let [thing,_] of level.things) {
      this.scene.remove(thing.model);
      this.terrain.forEach(t => this.scene.remove(t));
    }
  }

  loadLevel(level) {
    this.tiles = [level.grid.width, level.grid.height];
    this.terrainSize = [this.tiles[0] * TILE_SIZE, this.tiles[1] * TILE_SIZE];

    this.terrain = [];

    // Terrain tiles, centered on the origin
    const tileGeometry = new THREE.BoxGeometry(TILE_SIZE, .05, TILE_SIZE);
    for (let z = 0;  z < this.tiles[1]; ++z)
      for (let x = 0; x < this.tiles[0]; ++x)
      {
        const tile = new THREE.Mesh(
          tileGeometry,
          new THREE.MeshLambertMaterial());

        tile.position.set(
          -this.terrainSize[0]/2 + (x + 0.5) * TILE_SIZE,
          -0.025,
          -this.terrainSize[1]/2 + (z + 0.5) * TILE_SIZE);

        tile.modelType = ModelTypes.Terrain;
        tile.coords = [x, z];
        this.updateTileColor(tile, false);
        tile.receiveShadow = true;
        this.scene.add(tile);

        this.terrain.push(tile);
      }

    // Populate the grid

    const THING_MODELS =
    {
      WindTurbine: this.app.data.windturbine,
      SolarPanel: this.app.data.solarpanel,
      Battery: this.app.data.battery,
      Consumer: this.app.data.house,
      Obstacle: this.app.data.rock
    };

    for (let pair of level.things)
    {
      const thing = pair[0];
      const pos = pair[1];

      let model;

      if (thing.constructor.name === 'Consumer')
      {
        model = new THREE.Object3D();
        const modelPos = this.gridToWorld(pos[0], pos[1]);
        model.position.set(modelPos[0], 0, modelPos[1]);

        for (let i = 0; i < thing.size; ++i)
        {
          const house = loadModel(THING_MODELS['Consumer']);
          house.scale.set(TILE_SIZE*0.1, TILE_SIZE*0.1,TILE_SIZE*0.1);

          const maxOffset = TILE_SIZE * 0.5;
          house.position.set(Math.random() * maxOffset, 0, Math.random() * maxOffset);
          model.add(house);
        }

        this.scene.add(model);
      }
      else
      {
        model = loadModel(THING_MODELS[thing.constructor.name]);
        model.scale.set(TILE_SIZE*0.5, TILE_SIZE*0.5,TILE_SIZE*0.5);

        const modelPos = this.gridToWorld(pos[0], pos[1]);
        model.position.set(modelPos[0], 0, modelPos[1]);
        this.scene.add(model);
      }

      thing.model = model;
      model.thing = thing;
    }

    // Inventory
    level.inventory.forEach((item, i) =>
    {
      const model = loadModel(THING_MODELS[item.type.name]);
      model.scale.set(0.05, 0.05, 0.05);
      model.position.set(-0.75,   0.1 * i, -1);
      model.inventory = true;
      this.camera.add(model);
    });
  }

  render(dt)
  {
    // if (this.level) {
    //   for (let pair of this.level.things)
    //     pair[0].render(dt);
    // }
  }

  // Pick and return the grid tile at point coordinates (in canvas space), or
  // null
  pickGridTile(point) {
    // [canvas width, canvas height] -> [-1, 1]
    const cursor = {
      x: (point.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: -((point.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    this.raycaster.setFromCamera(cursor, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    for (let inter of intersections) {
      if (inter.object.modelType === ModelTypes.Terrain) {
        return inter.object;
      }
    }

    return null;
  }

  updateTileColor(tile, highlight)
  {
    if (!tile)
      return;

    if (highlight)
      tile.material.color.setHex(TILE_COLOR_HOVER);
    else
      tile.material.color.setHex(tile.coords[0] ^ tile.coords[1] ? TILE_COLOR_1 : TILE_COLOR_2);
  }

  gridToWorld(x, y)
  {
    return [
      x * TILE_SIZE - this.terrainSize[0] / 2,
      y * TILE_SIZE - this.terrainSize[1] / 2
    ];
  }

  worldToGrid(x, y)
  {
    return [
      Math.floor((x + this.terrainSize[0] / 2) / this.terrainSize[0] * this.tiles[0]),
      Math.floor((y + this.terrainSize[1] / 2) / this.terrainSize[1] * this.tiles[1])
    ];
  }
}
