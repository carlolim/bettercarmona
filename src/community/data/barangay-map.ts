// Shape handling adapted from BetterCatanduanes (MIT). See THIRD_PARTY_NOTICES.md.
import { geoArea } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { BARANGAYS, type Barangay } from './barangays';
import raw from './boundaries/bgysubmuns-municity-402104000.topo.0.1.json';

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
}

const topology = raw as unknown as Topology<{ 'bgysubmuns-municity-402104000': GeometryCollection<BoundaryProperties> }>;
const collection = feature(topology, topology.objects['bgysubmuns-municity-402104000']);

/** The boundary file names Barangays 1 to 8 by number and the rest by name, as the officials page does in brackets. */
function matches(barangay: Barangay, name: string): boolean {
  return name === `Barangay ${barangay.number}` || name === barangay.name;
}

export const BARANGAY_SHAPES: BarangayShape[] = BARANGAYS.map((barangay) => {
  const match = collection.features.find((f) => matches(barangay, f.properties.adm4_en));
  if (!match) throw new Error(`The boundary file has no shape for Barangay ${barangay.number}.`);
  const shape = structuredClone(match) as Feature<Polygon | MultiPolygon, BoundaryProperties>;
  // d3-geo wants exterior rings clockwise. A ring wound the other way covers the rest of the globe; flip it.
  const polygons = shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates;
  for (const polygon of polygons) {
    if (geoArea({ type: 'Polygon', coordinates: [polygon[0]] }) > 2 * Math.PI) for (const ring of polygon) ring.reverse();
  }
  return { barangay, feature: shape, townCenter: barangay.number <= 8 };
});

if (collection.features.length !== BARANGAYS.length) {
  throw new Error(`The boundary file has ${collection.features.length} shapes for ${BARANGAYS.length} barangays.`);
}
