export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  distanceFrom(p: Point): Vector {
    return new Vector(this.x - p.x, this.y - p.y);
  }

  add(d: Vector) {
    return new Point(this.x + d.dx, this.y + d.dy)
  }

  sub(d: Vector) {
    return new Point(this.x - d.dx, this.y - d.dy)
  }

  asDisplacement(): Vector {
    return new Vector(this.x, this.y);
  }
}

export class Vector {
  dx: number;
  dy: number;

  constructor(dx: number, dy: number) {
    this.dx = dx;
    this.dy = dy;
  }

  get norm(): number {
    return Math.sqrt(this.dx*this.dx + this.dy*this.dy);
  }

  get orthogonal(): Vector {
    return new Vector(-this.dy, this.dx);
  }

  scaleBy(c: number): Vector {
    return new Vector(this.dx * c, this.dy * c);
  }

  add(d: Vector): Vector {
    return new Vector(this.dx + d.dx, this.dy + d.dy);
  }
}
