class Grid {

  constructor(width, height) {
    if (width < 0) throw new Error('width must be > 0');
    if (height < 0) throw new Error('height must be > 0');
    this.width = width;
    this.height = height;
    this.cells = new Array(width * height);
  }

  // Throw if coordinates are out of bounds
  checkBounds(x,y) {
    if (!this.inBounds(x,y))
      throw new Error(`(${x},${y}) out of bounds [${0},${this.width}[`);
  }

  // Whether (x,y) is in bounds of this grid
  inBounds(x,y) {
    return (x >= 0 && x < this.width && y >= 0 && y < this.height);
  }

  // Return content of cell (x,y)
  getAt(x, y) {
    this.checkBounds(x, y);
    return this.cells[y * this.width + x];
  }

  // Put obj in cell (x,y)
  putAt(obj, x, y) {
    this.checkBounds(x, y);
    let pos = y * this.width + x;
    this.cells[pos] = obj;
  }

}
