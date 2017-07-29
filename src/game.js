// https://stackoverflow.com/questions/16357384/three-js-load-multiple-separated-objects-jsonloader/39402449#39402449
function loadModel(json)
{
  const loader = new THREE.ObjectLoader();
  const model = loader.parse(json);

  // Use vertex colors + Lambert shading
  model.traverse(child => child.material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors}));

  return model;
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

class Game
{
  constructor(app, levelNum)
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

    this.level = new Level(LEVELS[levelNum]);
    this.tiles = [this.level.grid.width, this.level.grid.height];
    this.terrainSize = [this.tiles[0] * TILE_SIZE, this.tiles[1] * TILE_SIZE];

    // Terrain centered on the origin
    this.terrain = new THREE.Mesh(
      new THREE.BoxGeometry(this.terrainSize[0], .05, this.terrainSize[1]),
      new THREE.MeshLambertMaterial({ color: 0x6daa2c }));
    this.scene.add(this.terrain);

    // Populate the grid
    for (let pair of this.level.things)
    {
      const thing = pair[0];
      const pos = pair[1];

      const model = loadModel(this.app.data.windturbine);
      model.scale.set(TILE_SIZE*0.5, TILE_SIZE*0.5,TILE_SIZE*0.5);

      const modelPos = this.gridToWorld(pos[0], pos[1]);
      model.position.set(modelPos[0], 0, modelPos[1]);
      this.scene.add(model);

      thing.model = model;
      model.thing = thing;
    }

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.position.set(4, 3, 4);
    dirLight.target = this.terrain;
    this.scene.add(dirLight);
  }

  render(dt)
  {
    for (let pair of this.level.things)
      pair[0].render(dt);
  }

  // Pick and return the grid cell at point coordinates (in canvas space), or
  // null
  pickGridCell(point) {
    // [canvas width, canvas height] -> [-1, 1]
    const cursor = {
      x: (point.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: -((point.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    this.raycaster.setFromCamera(cursor, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    for (let inter of intersections)
    {
      if (inter.object === this.terrain)
      {
        return this.worldToGrid(inter.point.x, inter.point.z);
      }
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
