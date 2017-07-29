let STATES = {};

STATES.Main = {
  enter() {
    // Initialize THREE.Scene and game logic
  },

  step(dt) {
    // Game logic update before render()
  },

  render() {
    // Render scene, usually
  },

};

// Skip the loading screen.  It always lasts at least 500ms, even without
// assets.
delete PLAYGROUND.LoadingScreen

window.addEventListener('DOMContentLoaded', function main() {
  new PLAYGROUND.Application({
    // dimensions of the WebGL buffer
    width: 320,
    height: 180,
    // scaled to screen dimensions
    scale: 3,

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

    ready() {
      if (Detector.webgl) {

        // Init WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
          antialias: this.smoothing,
          alpha: true,
        });
        this.renderer.setClearColor(0x272822);
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
