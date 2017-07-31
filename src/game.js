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

// Check if the object has an ancestor tagged as cosmetic
function isCosmetic(object)
{
  do {
    if (object.cosmetic)
      return true;

    object = object.parent;
  } while(object.parent);

  return false;
}

const TILE_SIZE = 0.2;
const THING_SCALE = 0.5;

const TILE_COLOR_1 = 0x6daa2c;
const TILE_COLOR_2 = 0x88b73c;
const TILE_COLOR_HOVER = new THREE.Color(0xffff00);
const TILE_COLOR_HOVER_ALPHA = 0.7;
const DAY_CLEARCOLOR = 0x6dc2ca;
const NIGHT_CLEARCOLOR = 0x00476e;

const HELD_THING_VERTICAL_OFFSET = 0.05;

const ModelTypes = {
  Terrain: 0,
  NextLevelButton: 1,
};

const ModelScales = {
  WindTurbine: 0.265,
  Battery: .7,
  SolarPanel: .5,
  Obstacle: .9,
}

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

    const addOutline = (color, strength) =>
    {
      const pass = new THREE.OutlinePass(new THREE.Vector2(this.app.width, this.app.height), this.scene, this.camera);
      pass.edgeStrength = strength;
      pass.edgeThickness = 0.2;
      pass.visibleEdgeColor.setHex(color);
      pass.hiddenEdgeColor.setHex(color);
      this.composer.addPass(pass);
      return pass;
    };

    this.selectionPass = addOutline(0xFFFFFF, 1); // White outline around selected things
    this.poweredPass = addOutline(0x00FF00, 3); // Green outline around powered things
    this.overpoweredPass = addOutline(0xFF0000, 3); // Red outline around overpowered things

    const copyPass = new THREE.ShaderPass(THREE.CopyShader);
    copyPass.renderToScreen = true;
    this.composer.addPass(copyPass);

    // Lighting

    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    this.dayLight = new THREE.DirectionalLight( 0xffffff, 1);
    this.dayLight.position.set(10, 15, 10);
    this.dayLight.castShadow = true;
    this.scene.add(this.dayLight);

    this.nightLight = new THREE.DirectionalLight( 0x819def, 1.5);
    this.nightLight.position.set(-10, 10, 10);
    this.nightLight.castShadow = true;
    this.scene.add(this.nightLight);

    // Lighter shadows:
    // https://stackoverflow.com/questions/40938238/shadow-darkness-in-threejs-and-object-opacity

    this.nextLevelButton = document.getElementById('next-level');
    this.hideNextLevelButton();

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

        // Make sure that the model touches the ground (might have been elevated when picked)
        thing.model.getObjectByName('model').position.y = 0;
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
  }

  showNextLevelButton() {
    this.nextLevelButton.style.display = 'inline';
  }

  hideNextLevelButton() {
    this.nextLevelButton.style.display = 'none';
  }

  unloadLevel(level) {
    // Remove all objects from the previous level, if any
    for (let [thing,_] of level.things) {
      this.scene.remove(thing.model);
    }
    this.terrain.forEach(t => this.scene.remove(t));
    this.scene.remove(this.dirt);
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

    // A big slab of dirt!
    const dirtGeometry = new THREE.BoxGeometry(this.tiles[0] * TILE_SIZE, .05, this.tiles[1] * TILE_SIZE);
    this.dirt = new THREE.Mesh(dirtGeometry, new THREE.MeshLambertMaterial({ color: 0x854c30 }));
    this.dirt.position.y = -0.05
    this.scene.add(this.dirt);
  }

  putNewThing(thing, pos)
  {
    // ROOT object with unit scale to attach other objects without issues
    const root = new THREE.Object3D();
    const modelPos = this.gridToWorld(pos[0], pos[1]);
    root.position.set(modelPos[0], 0, modelPos[1]);

    let model;

    if (thing.constructor.name === 'Consumer')
    {
      model = new THREE.Object3D();

      // Center single houses so we don't think they are part of a neighbouring
      // cell
      if (thing.size === 1) {
        const house = loadModel(THING_MODELS['Consumer']);
        house.position.set(-TILE_SIZE * 0.1, 0, -TILE_SIZE * 0.1);
        house.rotation.y = Math.random() * 360;
        house.scale.multiplyScalar(TILE_SIZE*0.12);
        model.add(house);
      }
      else {
        const positions = [[-TILE_SIZE * 0.2, -TILE_SIZE * 0.2], [TILE_SIZE * 0.2, TILE_SIZE * -0.05], [-TILE_SIZE * 0.12, TILE_SIZE * 0.2]];
        for (let i = 0; i < thing.size; ++i)
        {
          const house = loadModel(THING_MODELS['Consumer']);
          house.position.set(positions[i][0], 0, positions[i][1]);
          house.rotation.y = Math.random() * 360;
          house.scale.multiplyScalar(TILE_SIZE*0.08);
          model.add(house);
        }
      }

      model.rotation.y = Math.random() * 360;
    }
    else
    {
      model = loadModel(THING_MODELS[thing.constructor.name]);
      model.scale.multiplyScalar(TILE_SIZE * ModelScales[thing.constructor.name]);
    }

    model.name = 'model'; // To differentiate model from root

    thing.model = root;
    root.thing = thing;

    root.add(model);
    this.scene.add(root);
  }

  updateCoverage(thing, gridPos, visible, night)
  {
    // Remove previous coverage
    const oldCoverage = thing.model.getObjectByName('coverage');
    if (oldCoverage)
      thing.model.remove(oldCoverage);

    // Only recreate the coverage if it's currently visible
    if (!visible)
      return;

    const coverage = new THREE.Object3D();
    coverage.name = 'coverage';
    coverage.cosmetic = true;

    for (let tile of thing.getPoweredCells(gridPos[0], gridPos[1], night))
    {
      const outside = tile[0] < 0 || tile[0] >= this.tiles[0] || tile[1] < 0 || tile[1] >= this.tiles[1];
      const opacity = outside ? 0.1 : 0.5;

      const edges = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const plane = new THREE.Mesh(edges, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity }));

      const worldPos = this.gridToWorld(tile[0] - gridPos[0], tile[1] - gridPos[1]);
      plane.position.set((tile[0] - gridPos[0]) * TILE_SIZE, 0.001, (tile[1] - gridPos[1]) * TILE_SIZE);
      plane.rotation.x = -Math.PI / 2;

      coverage.add(plane);
    }

    thing.model.add(coverage);
  }

  moveThingAt(thing, gridPos)
  {
    const worldPos = this.gridToWorld(gridPos[0], gridPos[1]);
    thing.model.position.set(worldPos[0], 0, worldPos[1]);
    thing.model.getObjectByName('model').position.y = HELD_THING_VERTICAL_OFFSET;
  }

  // Instantiate the particle system on demand
  // (crash if done in the constructor, no idea why)
  createParticleSystem(texturePath, blendMode)
  {
    if (this.dustParticles)
      return;

    const particles = new SPE.Group({
      texture: {
        value: THREE.ImageUtils.loadTexture(texturePath)
      },
      blending: THREE.MinEquation,
      maxParticleCount: 10000
    });

    particles.mesh.position.set(0, 0, 0);
    this.scene.add(particles.mesh);
    return particles;
  }

  putParticleCloud(x, y)
  {
    if (!this.dustParticles)
      this.dustParticles = this.createParticleSystem('data/dust.png');

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

    this.dustParticles.addEmitter(emitter);

    // Program the removal of the emitter
    // XXX: sometimes make the particle engine crash
    /*setTimeout(() => {
      emitter.disable();
      this.dustParticles.removeEmitter(emitter);
    }, 2000);*/
  }

  // Show smoke particles to represent overpowered consumers
  showSmoke(thing, x, y, visible)
  {
    if (!this.smokeParticles)
      this.smokeParticles = this.createParticleSystem('data/smoke.png');

    if (!thing.model.smoke)
    {
      const pos = this.gridToWorld(x, y);

      const emitter = new SPE.Emitter({
        maxAge: {
          value: 3
        },
        position: {
          value: new THREE.Vector3(pos[0], 0.05, pos[1]),
          spread: new THREE.Vector3(0.05, 0.05, 0.05)
        },
        velocity: {
          value: new THREE.Vector3(0, 0.1, 0)
        },
        opacity: {
          value: [0.8, 0]
        },
        size: {
          value: [0.03, 0.1]
        },
        particleCount: 5
      });

      this.smokeParticles.addEmitter(emitter);

      // Keep a reference in the model for convenience
      thing.model.smoke = emitter;
    }

    if (visible)
      thing.model.smoke.enable();
    else
      thing.model.smoke.disable();
  }

  getTileAt(x, y) {
    return this.terrain[y * this.tiles[0] + x];
  }

  render(dt) {

    // Update live particle groups
    if (this.dustParticles)
      this.dustParticles.tick(dt);
    if (this.smokeParticles)
      this.smokeParticles.tick(dt);
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
      // Ignore attached objects (particles, grid...)
      if (isCosmetic(inter.object))
        continue;

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

    // Highlight the effective visual model, not the root (to avoid highlighting attached stuff)
    const model = thing.model.getObjectByName('model');

    if (highlight)
    {
      this.selectionPass.selectedObjects.push(model);
    }
    else
    {
      this.selectionPass.selectedObjects.splice(this.selectionPass.selectedObjects.indexOf(model), 1);
    }
  }

  outlineThing(thing, powered)
  {
    if (!thing)
      return;

    if (powered)
      this.poweredPass.selectedObjects.push(thing.model);
    else
      this.overpoweredPass.selectedObjects.push(thing.model);
  }

  clearOutline(thing)
  {
    if (!thing)
      return;

    this.poweredPass.selectedObjects.splice(this.poweredPass.selectedObjects.indexOf(thing.model), 1);
    this.overpoweredPass.selectedObjects.splice(this.overpoweredPass.selectedObjects.indexOf(thing.model), 1);
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
