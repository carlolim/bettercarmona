// Shape handling adapted from BetterCatanduanes (MIT). See THIRD_PARTY_NOTICES.md.
import { geoArea } from 'd3-geo';
import type { Feature, MultiPoint, MultiPolygon, Polygon, Position } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { BARANGAYS, type Barangay } from './barangays';
import { labelPoints } from './label-point';
import raw from './boundaries/bgysubmuns-municity-402104000.topo.0.1.json';
import rawNeighbors from './boundaries/carmona-neighbors.json';

/** Where the shapes come from. See boundaries/LICENSE.txt. */
export const BOUNDARY_SOURCE = {
  dataset: 'https://github.com/faeldon/philippines-json-maps/releases/tag/v1.1.1',
  original: 'https://data.humdata.org/dataset/cod-ab-phl',
  license: 'http://creativecommons.org/licenses/by/3.0/igo/legalcode',
  psgc: '3Q 2026',
};

interface BoundaryProperties {
  adm4_psgc: number;
  adm4_en: string;
}

export interface BarangayShape {
  barangay: Barangay;
  feature: Feature<Polygon | MultiPolygon, BoundaryProperties>;
  /** Barangays 1 to 8, too small on the city map and shown again in the town center inset. */
  townCenter: boolean;
  /** Where its label can go, best first. */
  labels: Position[];
}

const topology = raw as unknown as Topology<{ 'bgysubmuns-municity-402104000': GeometryCollection<BoundaryProperties> }>;
const collection = feature(topology, topology.objects['bgysubmuns-municity-402104000']);

/** The boundary file names Barangays 1 to 8 by number and the rest by name, as the officials page does in brackets. */
function matches(barangay: Barangay, name: string): boolean {
  return name === `Barangay ${barangay.number}` || name === barangay.name;
}

/** d3-geo wants exterior rings clockwise. A ring wound the other way covers the rest of the globe; flip it. */
function rewind<T extends Feature<Polygon | MultiPolygon>>(source: T): T {
  const shape = structuredClone(source);
  const polygons = shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates;
  for (const polygon of polygons) {
    if (geoArea({ type: 'Polygon', coordinates: [polygon[0]] }) > 2 * Math.PI) for (const ring of polygon) ring.reverse();
  }
  return shape;
}

export const BARANGAY_SHAPES: BarangayShape[] = BARANGAYS.map((barangay) => {
  const match = collection.features.find((f) => matches(barangay, f.properties.adm4_en));
  if (!match) throw new Error(`The boundary file has no shape for Barangay ${barangay.number}.`);
  const shape = rewind(match as Feature<Polygon | MultiPolygon, BoundaryProperties>);
  const polygons = shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates;
  return { barangay, feature: shape, townCenter: barangay.number <= 8, labels: labelPoints(polygons) };
});

export interface NeighborShape {
  /** As the boundary file names it, without "City of". */
  name: string;
  feature: Feature<MultiPolygon>;
  label: Position;
}

/** The cities and municipalities around Carmona, clipped to the city map's frame. Context only. */
export const NEIGHBORS: NeighborShape[] = rawNeighbors.features.map((f) => ({
  name: f.properties.adm3_en.replace(/^City of /, ''),
  feature: rewind(f as Feature<MultiPolygon>),
  label: f.properties.label,
}));

/** The area the city map shows: Carmona and a margin around it. */
export const FRAME: Feature<MultiPoint> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiPoint', coordinates: rawNeighbors.frame },
};

if (collection.features.length !== BARANGAYS.length) {
  throw new Error(`The boundary file has ${collection.features.length} shapes for ${BARANGAYS.length} barangays.`);
}
