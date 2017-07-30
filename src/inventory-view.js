const INVENTORY_ITEM_SCALE = 0.05;
const INVENTORY_ITEM_SPACING = 0.2;

class InventoryView
{
  constructor(app)
  {
    if (!app)
      throw new Error('App is undefined');
    this.app = app;

    this.scene = new THREE.Scene();

    this.raycaster = new THREE.Raycaster();

    const aspect = app.width / app.height;
    const frustrum = 1;
    this.camera = new THREE.OrthographicCamera(-frustrum*aspect/2, frustrum*aspect/2, frustrum/2, -frustrum/2, 0.1, 100 );
    this.camera.position.set(0, 2, 2);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);

    this.ambientLight = new THREE.AmbientLight(0x808080);
    this.scene.add(this.ambientLight);

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

  loadLevel(level)
  {
    const extent = (level.inventory.length - 1) * INVENTORY_ITEM_SPACING ;
    const start = -extent/2;

    level.inventory.forEach((item, i) =>
    {
      const model = loadModel(THING_MODELS[item.type.name]);
      model.scale.set(INVENTORY_ITEM_SCALE, INVENTORY_ITEM_SCALE, INVENTORY_ITEM_SCALE);
      model.position.set(start + i * INVENTORY_ITEM_SPACING, -0.35, -1);
      model.inventory = true;
      model.item = item;
      item.model = model;
      this.camera.add(model);
    });
  }

  render(dt)
  {
  }

  raycast(cameraPos)
  {
    this.raycaster.setFromCamera(cameraPos, this.camera);
    return this.raycaster.intersectObjects(this.scene.children, true);
  }

  updatePicking(point)
  {
    this.pickingResult = {};

    point = {
      x: (point.x / this.app.renderer.domElement.clientWidth) * 2 - 1,
      y: -((point.y / this.app.renderer.domElement.clientHeight) * 2 - 1)
    };
    const intersections = this.raycast(point);

    for (let inter of intersections)
    {
      if (getInventoryItem(inter.object))
      {
        this.pickingResult.inventoryItem = getInventoryItem(inter.object);
        return;
      }
    }
  }

  pickInventoryItem() {
    return this.pickingResult.inventoryItem;
  }

}
