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

const TILE_SIZE = 0.2;
const TILE_COLOR_1 = 0x6daa2c;
const TILE_COLOR_2 = 0x79a92b;
const TILE_COLOR_HOVER = new THREE.Color(0xffff00);
const TILE_COLOR_HOVER_ALPHA = 0.7;
const DAY_CLEARCOLOR = 0x6dc2ca;
const NIGHT_CLEARCOLOR = 0x00476e;

const HELD_THING_VERTICAL_OFFSET = 0.05;

const ModelTypes = {
  Terrain: 0,
  NextLevelButton: 1,
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
    this.camera.position.set(.5, 2, 2);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);

    // Render pipeline
    //  1 - normal render
    //  2 - outline selected objects
    //  3 - copy to screen

    this.composer = new THREE.EffectComposer(this.app.renderer);

    const renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new THREE.OutlinePass(new THREE.Vector2(this.app.width, this.app.height), this.scene, this.camera);
    this.outlinePass.edgeStrength = 1;
    this.outlinePass.edgeThickness = 0.25;
    this.outlinePass.visibleEdgeColor.setHex(0xFFFFFF);
    this.outlinePass.hiddenEdgeColor.setHex(0xFFFFFF);
    this.composer.addPass(this.outlinePass);

    const copyPass = new THREE.ShaderPass(THREE.CopyShader);
    copyPass.renderToScreen = true;
    this.composer.addPass(copyPass);

    // Lighting

    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    this.dirLight.position.set(4, 3, 4);
    this.dirLight.castShadow = true;
    this.scene.add(this.dirLight);
    // Lighter shadows:
    // https://stackoverflow.com/questions/40938238/shadow-darkness-in-threejs-and-object-opacity

    let texture = new THREE.TextureLoader().load( 'data/next-level-button2.png' );
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    let sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({map: texture, color: 0xffffff })
    );
    sprite.position.set(.8, 0, .3);
    sprite.scale.multiplyScalar(0.2);
    sprite.modelType = ModelTypes.NextLevelButton;
    this.nextLevelButton = sprite;
    sprite.visible = false;
    this.scene.add(sprite);

    // Events coming from the model

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

    document.addEventListener('thing rotated', ev => {
      let {thing} = ev.detail;
      thing.model.rotation.y = thing.rotationAsRadian();
    });
  }

  showNextLevelButton() {
    this.nextLevelButton.visible = true;
  }

  hideNextLevelButton() {
    this.nextLevelButton.visible = false;
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
  }

  putNewThing(thing, pos)
  {
    let model;

    if (thing.constructor.name === 'Consumer')
    {
      model = new THREE.Object3D();
      const modelPos = this.gridToWorld(pos[0], pos[1]);
      model.position.set(modelPos[0], 0, modelPos[1]);

      const positions = [[-TILE_SIZE * 0.25, -TILE_SIZE * 0.25], [TILE_SIZE * 0.25, TILE_SIZE * -0.05], [-TILE_SIZE * 0.15, TILE_SIZE * 0.25]];
      for (let i = 0; i < thing.size; ++i)
      {
        const house = loadModel(THING_MODELS['Consumer']);
        house.position.set(positions[i][0], 0, positions[i][1]);
        house.rotation.y = Math.random() * 360;
        house.scale.set(TILE_SIZE*0.1, TILE_SIZE*0.1,TILE_SIZE*0.1);
        model.add(house);
      }

      model.rotation.y = Math.random() * 360;
      this.scene.add(model);
    }
    else
    {
      model = loadModel(THING_MODELS[thing.constructor.name]);
      model.scale.set(TILE_SIZE*0.5, TILE_SIZE*0.5,TILE_SIZE*0.5);

      const modelPos = this.gridToWorld(pos[0], pos[1]);
      model.position.set(modelPos[0], 0, modelPos[1]);
      this.scene.add(model);


      if (thing instanceof WindTurbine ||
          thing instanceof SolarPanel) {
        model.rotation.y = thing.rotationAsRadian();
      }
    }

    thing.model = model;
    model.thing = thing;
  }

  moveToCursor(thing, pointer)
  {
    const intersections = this.raycast(this.eventToCameraPos(pointer));
    if (intersections.length)
    {
      const hit = intersections[0].point;
      const newPos = this.snapWorld(hit.x, hit.z);
      thing.model.position.set(newPos[0], HELD_THING_VERTICAL_OFFSET, newPos[1]);
    }
  }

  putParticleCloud(x, y)
  {
    if (!this.particles)
    {
      this.particles = new SPE.Group({
        texture: {
          value: THREE.ImageUtils.loadTexture('data/dust.png')
        },
        maxParticleCount: 100
      });

      this.particles.mesh.position.set(0, 0, 0);
      this.scene.add(this.particles.mesh);
    }

    const pos = this.gridToWorld(x, y);

    const emitter = new SPE.Emitter({
      maxAge: {
        value: 1
      },
      position: {
        value: new THREE.Vector3(pos[0], 0, pos[1]),
        spread: new THREE.Vector3(0.05, 0, 0.05)
      },
      velocity: {
        value: new THREE.Vector3(0, 0.05, 0),
        spread: new THREE.Vector3(0.25, 0.02, 0.25)
      },
      acceleration: {
        value: new THREE.Vector3(0, -0.025, 0)
      },
      color: {
        value: [new THREE.Color('yellow'), new THREE.Color('white')]
      },
      opacity: {
        value: [0.8, 0]
      },
      size: {
        value: [0.12, 0.06]
      },
      particleCount: 5,
      duration: 0.25
    });

    this.particles.addEmitter(emitter);

    //setTimeout(() => this.particles.removeEmitter(emitter), 10000);
  }

  getTileAt(x, y) {
    return this.terrain[y * this.tiles[0] + x];
  }

  render(dt) {

    // Update live particle emitter
    if (this.particles)
      this.particles.tick(dt);
  }

  updatePicking(point, night) {

    let width = this.app.renderer.domElement.clientWidth;
    if (night) {
      width /= 2;
      if (point.x > width) {
        point.x -= width;
      }
    }

    this.pickingResult = {};

    point = {
      x: (point.x / width) * 2 - 1,
      y: -((point.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    const intersections = this.raycast(point);

    for (let inter of intersections)
    {
      // Generator
      if (!this.pickingResult.generator && getGenerator(inter.object))
      {
        this.pickingResult.generator = getGenerator(inter.object);
      }
      // Empty tile
      else if (!this.pickingResult.tile && inter.object.modelType === ModelTypes.Terrain)
      {
        this.pickingResult.tile = inter.object.tile;
      }
      // Next level button
      else if (!this.pickingResult.button && inter.object.modelType === ModelTypes.NextLevelButton) {
        this.pickingResult.nextLevelButton = inter.object;
      }
    }
  }

  pickGridTile() {
    return this.pickingResult.tile;
  }

  pickGenerator() {
    return this.pickingResult.generator;
  }

  pickButton() {
    return this.pickingResult.nextLevelButton;
  }

  updateTileColor(tile, highlight, mispowered)
  {
    if (!tile)
      return;

    if (mispowered) {
      tile.material.color.lerp(new THREE.Color(0xff0000), 0.7);
    }
    else if (highlight) {
      tile.material.color.lerp(TILE_COLOR_HOVER, TILE_COLOR_HOVER_ALPHA);
    } else {
      tile.material.color.setHex((tile.coords[0] & 1) ^ (tile.coords[1] & 1) ? TILE_COLOR_1 : TILE_COLOR_2);
    }
  }

  highlightThing(thing, highlight)
  {
    if (!thing)
      return;

    if (highlight)
      this.outlinePass.selectedObjects.push(thing.model);
    else
      this.outlinePass.selectedObjects.splice(this.outlinePass.selectedObjects.indexOf(thing.model), 1);
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

  snapWorld(x, y)
  {
    const gridPos = this.worldToGrid(x, y);
    return this.gridToWorld(gridPos[0], gridPos[1]);
  }
}
