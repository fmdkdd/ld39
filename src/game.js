// https://stackoverflow.com/questions/16357384/three-js-load-multiple-separated-objects-jsonloader/39402449#39402449
function loadModel(json)
{
  const loader = new THREE.ObjectLoader();
  const model = loader.parse(json);

  // Use vertex colors + Lambert shading
  model.traverse(child => child.material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors}));

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

const TILE_SIZE = 0.2;

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
    this.camera.position.set(.5, 2, 2);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);

    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    this.dirLight.position.set(4, 3, 4);
    this.scene.add(this.dirLight);

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

  loadLevel(levelNum) {
    // Remove all objects from the previous level, if any
    if (this.level) {
      for (let [thing,_] of this.level.things) {
        this.scene.remove(thing.model);
        this.terrain.forEach(t => this.scene.remove(t));
      }
    }

    this.level = new Level(LEVELS[levelNum]);
    this.tiles = [this.level.grid.width, this.level.grid.height];
    this.terrainSize = [this.tiles[0] * TILE_SIZE, this.tiles[1] * TILE_SIZE];
    this.terrain = [];

    // Build terrain centered on the origin
    for (let x = 0; x < this.tiles[0]; ++x) {
      for (let y = 0; y < this.tiles[1]; ++y) {
        let tile = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, .05, TILE_SIZE),
          new THREE.MeshLambertMaterial({ color: 0x6daa2c }));
        const modelPos = this.gridToWorld(x,y);
        tile.position.set(modelPos[0], 0, modelPos[1]);
        this.scene.add(tile);
        tile.modelType = ModelTypes.Terrain;
        tile.coords = [x,y];
        this.terrain.push(tile);
      }
    }
    // this.dirLight.target = this.terrain;

    // Populate the grid
    for (let [thing,pos] of this.level.things)
    {
      const model = loadModel(this.app.data.windturbine);
      model.scale.set(TILE_SIZE*0.5, TILE_SIZE*0.5,TILE_SIZE*0.5);

      const modelPos = this.gridToWorld(pos[0], pos[1]);
      model.position.set(modelPos[0], 0, modelPos[1]);
      this.scene.add(model);

      thing.model = model;
      model.thing = thing;
    }

  }

  render(dt)
  {
    if (this.level) {
      for (let pair of this.level.things)
        pair[0].render(dt);
    }
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

    for (let inter of intersections)
    {
      if (inter.object.modelType === ModelTypes.Terrain) {
        return inter.object;
      }
        //return this.worldToGrid(inter.point.x, inter.point.z);
    }

    return null;
  }

  pointermove(event)
  {
    // [canvas width, canvas height] -> [-1, 1]
    const cursor = {
      x: (event.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: -((event.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    this.raycaster.setFromCamera(cursor, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    for (let inter of intersections)
    {
      // Inventory item
      if (false)
      {
        //console.log('inventory');
        return;
      }
      // Built generator
      else if (isGenerator(inter.object))
      {
        //console.log('generator');
        return;
      }
      // Empty tile
      else if (inter.object === this.terrain)
      {
        //console.log('empty tile', this.worldToGrid(inter.point.x, inter.point.z));
        return;
      }
    }
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
