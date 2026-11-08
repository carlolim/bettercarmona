/**
 * Builds src/community/data/boundaries/carmona-neighbors.json: the cities and municipalities
 * around Carmona, clipped to a frame a little larger than the city, for the home page map.
 *
 *   npm run build:neighbors -- <dir>
 *
 * <dir> is topojson/provdists/hires from the philippines-json-maps v1.1.1 topojson-hires.zip,
 * the same release as the barangay file. See src/community/data/boundaries/LICENSE.txt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, exit } from 'node:process';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

const CARMONA = 402104000;
/** Cavite, Laguna, and Metro Manila's Fourth District: everything near Carmona. */
const PROVDISTS = [402100000, 403400000, 1307600000];
/** How far the frame reaches past Carmona's own extent, as a share of its width and height. */
const MARGIN = 0.18;

interface Props { adm3_psgc: number; adm3_en: string; adm2_psgc: number }

const dir = argv[2];
if (!dir) {
  console.error('Usage: npm run build:neighbors -- <topojson/provdists/hires>');
  exit(1);
}

const features = PROVDISTS.flatMap((code) => {
  const name = `municities-provdist-${code}`;
  const topology = JSON.parse(readFileSync(join(dir, `${name}.topo.0.1.json`), 'utf8')) as Topology<Record<string, GeometryCollection<Props>>>;
  return (feature(topology, topology.objects[name]) as FeatureCollection<Polygon | MultiPolygon, Props>).features;
});

const carmona = features.find((f) => f.properties.adm3_psgc === CARMONA);
if (!carmona) throw new Error('Carmona is missing from the Cavite file.');
const polygonsOf = (f: Feature<Polygon | MultiPolygon>) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const all = polygonsOf(carmona).flat(2);
const [x0, x1] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
const [y0, y1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
const frame = {
  west: x0 - (x1 - x0) * MARGIN, east: x1 + (x1 - x0) * MARGIN,
  south: y0 - (y1 - y0) * MARGIN, north: y1 + (y1 - y0) * MARGIN,
};

/** Sutherland-Hodgman against each side of the frame. Fine at this scale, where lines of longitude and latitude are straight. */
function clip(ring: Position[]): Position[] {
  const edges: [(p: Position) => boolean, (a: Position, b: Position) => Position][] = [
    [(p) => p[0] >= frame.west, (a, b) => at(a, b, 0, frame.west)],
    [(p) => p[0] <= frame.east, (a, b) => at(a, b, 0, frame.east)],
    [(p) => p[1] >= frame.south, (a, b) => at(a, b, 1, frame.south)],
    [(p) => p[1] <= frame.north, (a, b) => at(a, b, 1, frame.north)],
  ];
  let out = ring.slice(0, -1);
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    input.forEach((p, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(p)) {
        if (!inside(prev)) out.push(cross(prev, p));
        out.push(p);
      } else if (inside(prev)) out.push(cross(prev, p));
    });
    if (!out.length) return [];
  }
  return [...out, out[0]];
}
function at(a: Position, b: Position, axis: 0 | 1, value: number): Position {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const round = (p: Position): Position => [+p[0].toFixed(6), +p[1].toFixed(6)];
const neighbors = features
  .filter((f) => f.properties.adm3_psgc !== CARMONA)
  .map((f) => {
    const polygons = polygonsOf(f).map((polygon) => polygon.map(clip).filter((r) => r.length >= 4)).filter((p) => p.length);
    return { f, polygons };
  })
  .filter(({ polygons }) => polygons.length)
  .map(({ f, polygons }): Feature<MultiPolygon> => ({
    type: 'Feature',
    properties: {
      adm3_psgc: f.properties.adm3_psgc,
      adm3_en: f.properties.adm3_en,
      adm2_psgc: f.properties.adm2_psgc,
    },
    geometry: { type: 'MultiPolygon', coordinates: polygons.map((p) => p.map((r) => r.map(round))) },
  }));

const out = {
  type: 'FeatureCollection',
  source: 'philippines-json-maps v1.1.1, topojson-hires.zip, topojson/provdists/hires, clipped by scripts/build-neighbors.ts',
  frame: [[+frame.west.toFixed(6), +frame.south.toFixed(6)], [+frame.east.toFixed(6), +frame.north.toFixed(6)]],
  features: neighbors,
};
writeFileSync('src/community/data/boundaries/carmona-neighbors.json', `${JSON.stringify(out)}\n`);
console.log(neighbors.map((n) => `${n.properties!.adm3_en} (${n.geometry.coordinates.flat(2).length} points)`).join('\n'));
