function loadModel(json)
{
  const loader = new THREE.JSONLoader();
  const model = loader.parse(json);

  const material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
  const object = new THREE.Mesh( model.geometry, material);
  return object;
}

// TEMP
const TILES = 10;
const PLANE_SIZE = 2;

class Game
{
  constructor(app)
  {
    this.app = app;

    this.scene = new THREE.Scene();

    const aspect = app.width / app.height;
    const frustrum = 1;
    this.camera = new THREE.OrthographicCamera(-frustrum*aspect/2, frustrum*aspect/2, frustrum/2, -frustrum/2, 0.1, 100 );
    this.camera.position.set(.5, 1, 2);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);

    this.windTurbineModel = loadModel(app.data.windturbine);
    this.windTurbineModel.scale.set(.1, .1, .1);
    this.scene.add(this.windTurbineModel);

    this.terrain = new THREE.Mesh(
      new THREE.BoxGeometry(PLANE_SIZE, .05, PLANE_SIZE),
      new THREE.MeshLambertMaterial({ color: 0x6daa2c }));
    this.scene.add(this.terrain);

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.position.set(4, 3, 4);
    dirLight.target = this.terrain;
    this.scene.add(dirLight);

    this.raycaster = new THREE.Raycaster();
  }

  step(dt)
  {

  }

  pointermove(event)
  {
    // [canvas width, canvas height] -> [-1, 1]
    const cursor = {
      x: (event.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: (event.y / this.app.renderer.domElement.clientHeight) * 2 - 1
    };

    this.raycaster.setFromCamera(cursor, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    const hit = intersections.find(i => i.object === this.terrain);
    if (hit)
    {
      hit.point.x = Math.floor((hit.point.x + PLANE_SIZE / 2) / PLANE_SIZE * TILES);
      hit.point.z = Math.floor((hit.point.z + PLANE_SIZE / 2) / PLANE_SIZE * TILES);
    }
  }
}
