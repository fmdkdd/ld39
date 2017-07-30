let STATES = {};

STATES.Main = {
  enter() {
    window.G = this.gameController = new GameController(this.app);
    this.gameController.loadLevel(0);
    this.pointer = {x:0, y:0};
  },

  render(dt) {
    this.gameController.render(dt);
  },

  pointermove(event) {

    // Update position relative to the canvas
    this.pointer.x = event.original.clientX - this.app.renderer.domElement.offsetLeft;
    this.pointer.y = event.original.clientY - this.app.renderer.domElement.offsetTop;

    this.gameController.pointermove(this.pointer);
  },

  pointerdown(event) {
    if (event.button == 'left') {
      this.gameController.leftclick();
    } else if (event.button == 'right') {
      this.gameController.rightclick();
    }
  },
};

const MODELS = [
  'windturbine.json',
  'solarpanel.json',
  'battery.json',
  'rock.json',
  'house.json'
];

// Skip the loading screen.  It always lasts at least 500ms, even without
// assets.
delete PLAYGROUND.LoadingScreen

window.addEventListener('DOMContentLoaded', function main() {
  new PLAYGROUND.Application({
    // dimensions of the WebGL buffer
    width: 320,
    height: 180,
    // scaled to screen dimensions
    scale: 2.5,

    smoothing: false,

    preload() {
      // Put FPS counter to bottom right
      this.stats = new Stats();
      this.stats.dom.style.left = '';
      this.stats.dom.style.top = '';
      this.stats.dom.style.right = 0;
      this.stats.dom.style.bottom = 0;
      document.body.appendChild(this.stats.dom);
    },

    create() {
      MODELS.forEach(asset => this.loadData(asset));
    },

    ready() {
      if (Detector.webgl) {

        // Init WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
          antialias: this.smoothing,
          alpha: true
        });
        this.renderer.setClearColor(DAY_CLEARCOLOR);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setSize(this.width, this.height, false);
        this.renderer.domElement.style.width = this.width * this.scale + 'px';
        this.renderer.domElement.style.height = this.height * this.scale + 'px';
        this.container.appendChild(this.renderer.domElement);

        // Go to default state
        this.setState(STATES.Main);
      } else {
        // WebGL not supported: abort and report error
        this.container.appendChild(Detector.getWebGLErrorMessage());
      }
    },

    // Record FPS through the prerender and postrender events
    postrender() { this.stats.update(); },
  })
})
