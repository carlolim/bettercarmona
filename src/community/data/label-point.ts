import type { Position } from 'geojson';

/**
 * Points inside a shape on a grid, best first: farthest from the shape's edges. The map takes the
 * first one whose label doesn't overlap another.
 */
export function labelPoints(polygons: Position[][][], steps = 60): Position[] {
  const rings = polygons.flat();
  const points = rings.flat();
  const [x0, x1] = [Math.min(...points.map((p) => p[0])), Math.max(...points.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[1]))];
  // Even-odd across all rings, so holes count as outside.
  const inside = (p: Position) => rings.reduce((hit, ring) => hit !== ring.slice(0, -1).reduce((crossed, q, i, arr) => {
    const s = arr[(i + 1) % arr.length];
    return (q[1] > p[1]) !== (s[1] > p[1]) && p[0] < ((s[0] - q[0]) * (p[1] - q[1])) / (s[1] - q[1]) + q[0] ? !crossed : crossed;
  }, false), false);
  const edgeDistance = (p: Position) => Math.min(...rings.flatMap((ring) => ring.slice(0, -1).map((q, i) => {
    const s = ring[i + 1];
    const [dx, dy] = [s[0] - q[0], s[1] - q[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - (q[0] + t * dx), p[1] - (q[1] + t * dy));
  })));
  const found: [Position, number][] = [];
  for (let i = 1; i < steps; i++) for (let j = 1; j < steps; j++) {
    const p: Position = [x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * j) / steps];
    if (inside(p)) found.push([p, edgeDistance(p)]);
  }
  if (!found.length) return [[(x0 + x1) / 2, (y0 + y1) / 2]];
  found.sort((a, b) => b[1] - a[1]);
  // Keep the better half: points closer to the edges than that make poor labels.
  return found.slice(0, Math.max(1, Math.ceil(found.length / 2))).map(([p]) => p);
}
