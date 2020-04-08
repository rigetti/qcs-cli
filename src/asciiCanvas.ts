/*
  A canvas to draw simple ASCII art.

  The coordinate system has its origin in the lower left, with
  higher Y values being higher on screen, a la PDF/PostScript
  display coordinates.

*/


export type Point = [number, number];

export class AsciiCanvas {

  canvas: Array<Array<string>>;

  constructor(width: number, height: number) {
    this.canvas = [];
    for (let i = 0; i < height; i++) {
      let row = new Array(width);
      this.canvas.push(row.fill(' '));
    }
  }

  putChar(p: Point, ch: string) {
    let [x, y] = p;
    // Invert the y coordinate so up is up
    y = (this.canvas.length - 1) - y;
    this.canvas[y][x] = ch;
  }

  putString(p: Point, str: string) {
    let [x, y] = p;
    // XXX: Strings are right-aligned, which matches drawing qubit
    // indices fine but may need to be adjusted if you need to draw
    // other things.
    const offset = str.length - 1;
    str.split('').forEach(ch => {
      this.putChar([x - offset, y], ch);
      x++;
    });
  }

  line(start: Point, end: Point) {
    let [x0, y0]: Point = start;
    let [x1, y1]: Point = end;

    if (x0 == x1 && y0 == y1) {
      // Nothing to draw
      return;
    } else if (x0 == x1) {
      // Vertical line
      for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y++) {
        this.putChar([x0, y], '|');
      }
    } else if (y0 == y1) {
      // Horizontal line
      for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x++) {
        this.putChar([x, y0], '-');
      }
    } else if (Math.abs(x0 - x1) == Math.abs(y0 - y1)) {
      // Diagonal line
      if (x0 < x1) {
        // Left to right
        if (y0 < y1) {
          // Going up and right
          for (let x = x0, y = y0; x < x1; x++, y++) {
            this.putChar([x, y], '/');
          }
        } else {
          // Going down and right
          for (let x = x0, y = y0; x < x1; x++, y--) {
            this.putChar([x, y], '\\' );
          }
        }
      } else {
        // Going right to left
        if (y0 < y1) {
          // Going up and left
          for (let x = x0, y = y0; x > x1; x--, y++) {
            this.putChar([x, y], '\\');
          }
        } else {
          // Going down and left
          for (let x = x0, y = y0; x > x1; x--, y--) {
            this.putChar([x, y], '/');
          }
        }
      }
    } else {
      throw new Error(`Cannot draw a line that way: ${start} -> ${end}`);
    }
  }

  shrinkWrap() {
    // Remove whitespace from the top, bottom, and front of the canvas rows
    const firstNonSpaceIndex = row => row.findIndex(elt => elt != ' ');
    const emptyRow = row => -1 == firstNonSpaceIndex(row);

    let rows = this.canvas.filter(row => !emptyRow(row));
    let maxIndent: number = 999;

    rows.forEach(row => {
      maxIndent = Math.min(maxIndent, firstNonSpaceIndex(row));
    });

    return rows.map(row => row.splice(maxIndent));
  }

  toString() {
    return '    ' + this.shrinkWrap().map(row => row.join('').trimEnd()).join('\n    ');
  }
}


export const PointMath = {
  add: (p1: Point, p2: Point): Point => {
    return [p1[0] + p2[0],
            p1[1] + p2[1]];
  }
};
