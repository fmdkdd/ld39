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

// Look for a generator in parents
function getGenerator(object)
{
  do {
    if (object.thing instanceof Generator)
      return object.thing;

    object = object.parent;
  } while(object.parent);

  return null;
}

function getInventoryItem(object)
{
  do {
    if (object.inventory)
      return object.item;

    object = object.parent;
  } while(object.parent);

  return null;
}

const TILE_SIZE = 0.2;
const TILE_COLOR_1 = 0x6daa2c;
const TILE_COLOR_2 = 0x79a92b;
const TILE_COLOR_HOVER = new THREE.Color(0xffff00);
const TILE_COLOR_HOVER_ALPHA = 0.7;
const DAY_CLEARCOLOR = 0x6dc2ca;
const NIGHT_CLEARCOLOR = 0x00476e;

const INVENTORY_ITEM_SCALE = 0.05;

const ModelTypes = {
  Terrain: 0,
};

let THING_MODELS;

class Game
{
  constructor(app)
  {
    this.app = app;

    THING_MODELS =
    {
      WindTurbine: this.app.data.windturbine,
      SolarPanel: this.app.data.solarpanel,
      Battery: this.app.data.battery,
      Consumer: this.app.data.house,
      Obstacle: this.app.data.rock
    };

    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();

    this.views = [];

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

    document.addEventListener('init terrain', ev => {
      let {width, height} = ev.detail;

      this.tiles = [width, height];
      this.terrainSize = [this.tiles[0] * TILE_SIZE, this.tiles[1] * TILE_SIZE];
    });

    document.addEventListener('level put thing', ev => {
      let {thing, pos} = ev.detail;
      if (thing.model) {
        const modelPos = this.gridToWorld(pos[0], pos[1]);
        thing.model.position.set(modelPos[0], 0, modelPos[1]);
        thing.model.visible = true;
      }
      else {
        this.putNewThing(thing, pos);
      }
    });

    document.addEventListener('level removed thing', ev => {
      let thing = ev.detail.thing;
      if (thing.model) {
        thing.model.visible = false;
      }
    });

    document.addEventListener('item picked from inventory', ev => {
      let item = ev.detail.item;
      if (item.model) {
        //item.model.scale.set(INVENTORY_ITEM_SCALE * 0.7, INVENTORY_ITEM_SCALE * 0.7, INVENTORY_ITEM_SCALE * 0.7);
        item.model.traverse(c => {
          c.material.color.setHex(0x888888);
          c.material.vertexColors = THREE.NoColors;
        });
      }
    });

    document.addEventListener('item put in inventory', ev => {
      let item = ev.detail.item;
      if (item.model) {
        //item.model.scale.set(INVENTORY_ITEM_SCALE * 0.7, INVENTORY_ITEM_SCALE * 0.7, INVENTORY_ITEM_SCALE * 0.7);
        item.model.traverse(c => {
          c.material.color.setHex(0xFFFFFF);
          c.material.vertexColors = THREE.VertexColors;
        });
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
        tile.tile = tile;
        tile.coords = [x, z];
        this.updateTileColor(tile, false);
        tile.receiveShadow = true;
        this.scene.add(tile);

        this.terrain.push(tile);
      }

    // Inventory
    level.inventory.forEach((item, i) =>
    {
      const model = loadModel(THING_MODELS[item.type.name]);
      model.scale.set(INVENTORY_ITEM_SCALE, INVENTORY_ITEM_SCALE, INVENTORY_ITEM_SCALE);
      model.position.set(-0.75,   0.1 * i, -1);
      model.inventory = true;
      model.item = item;
      item.model = model;
      this.camera.add(model);
    });
  }

  putNewThing(thing, pos)
  {
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

  render(dt) {
  }

  updatePicking(point, night) {

    let width = this.app.renderer.domElement.clientWidth;
    if (night) {
      width /= 2;
    }

    this.pickingResult = {};

    point = {
      x: (point.x / width) * 2 - 1,
      y: -((point.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    const intersections = this.raycast(point);

    for (let inter of intersections)
    {
      // Inventory item
      if (!this.pickingResult.inventoryItem && getInventoryItem(inter.object))
      {
        this.pickingResult.inventoryItem = getInventoryItem(inter.object);
      }
      // Generator
      else if (!this.pickingResult.generator && getGenerator(inter.object))
      {
        this.pickingResult.generator = getGenerator(inter.object);
      }
      // Empty tile
      else if (!this.pickingResult.tile && inter.object.modelType === ModelTypes.Terrain)
      {
        this.pickingResult.tile = inter.object.tile;
      }
    }
  }

  pickGridTile() {
    return this.pickingResult.tile;
  }

  pickInventoryItem() {
    return this.pickingResult.inventoryItem;
  }

  pickGenerator() {
    return this.pickingResult.generator;
  }

  updateTileColor(tile, highlight)
  {
    if (!tile)
      return;

    if (highlight) {
      tile.material.color.lerp(TILE_COLOR_HOVER, TILE_COLOR_HOVER_ALPHA);
    } else {
      tile.material.color.setHex(tile.coords[0] ^ tile.coords[1] ? TILE_COLOR_1 : TILE_COLOR_2);
    }
  }

  eventToCameraPos(event)
  {
    // [canvas width, canvas height] -> [-1, 1]
    return {
      x: (event.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: -((event.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
  }

  raycast(cameraPos)
  {
    this.raycaster.setFromCamera(cameraPos, this.camera);
    return this.raycaster.intersectObjects(this.scene.children, true);
  }

  gridToWorld(x, y)
  {
    return [
      x * TILE_SIZE - this.terrainSize[0] / 2 + TILE_SIZE / 2,
      y * TILE_SIZE - this.terrainSize[1] / 2 + TILE_SIZE / 2
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
