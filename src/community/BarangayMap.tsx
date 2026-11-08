// Map drawing adapted from BetterCatanduanes (MIT). See THIRD_PARTY_NOTICES.md.
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPoint, MultiPolygon, Polygon } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BARANGAY_SHAPES, FRAME, NEIGHBORS, type BarangayShape } from './data/barangay-map';

const PAD = 12;
const outsideTownCenter = (shape: BarangayShape) => !shape.townCenter;
const inTownCenter = (shape: BarangayShape) => shape.townCenter;

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
/** The box a label takes, centered on a point. Widths are estimated: about 0.6em a character in bold Figtree. */
function boxAt([x, y]: [number, number], text: string[], size: number): Box {
  const w = (Math.max(...text.map((t) => t.length)) * size * 0.6) / 2 + 2;
  const h = (text.length * size * 1.15) / 2 + 1;
  return [x - w, y - h, x + w, y + h];
}

interface Props {
  /** The barangay under the pointer or keyboard focus, highlighted on both maps. */
  active: number | null;
  onPreview: (number: number | null) => void;
  onSelect: (number: number) => void;
  label: (number: number) => string;
  cityLabel: string;
  insetLabel: string;
  insetHeading: string;
}

/**
 * The city with all 14 barangays, and an inset of the town center, where Barangays 1 to 8 are too
 * small to tap on the city map. Pointer only: the list of buttons beside it is the keyboard route.
 */
export function BarangayMap({ active, onPreview, onSelect, label, cityLabel, insetLabel, insetHeading }: Props) {
  const townCenter = useMemo(() => BARANGAY_SHAPES.filter((s) => s.townCenter), []);
  const townCenterArea = useMemo(() => collectionOf(townCenter), [townCenter]);
  return (
    <div className="barangay-map">
      <MapPanel
        className="barangay-map-city"
        fitTo={FRAME}
        neighbors
        frame={townCenter}
        labelled={outsideTownCenter}
        title={cityLabel}
        {...{ active, onPreview, onSelect, label }}
      />
      <figure className="barangay-map-inset">
        <figcaption>{insetHeading}</figcaption>
        <MapPanel
          className="barangay-map-town"
          fitTo={townCenterArea}
          labelled={inTownCenter}
          short
          title={insetLabel}
          {...{ active, onPreview, onSelect, label }}
        />
      </figure>
    </div>
  );
}

function collectionOf(shapes: BarangayShape[]): FeatureCollection<Polygon | MultiPolygon> {
  return { type: 'FeatureCollection', features: shapes.map((s) => s.feature) };
}

function MapPanel({ className, fitTo, neighbors, frame, labelled, short, title, active, onPreview, onSelect, label }: {
  className: string;
  /** The area to fill the panel with. */
  fitTo: FeatureCollection<Polygon | MultiPolygon> | Feature<MultiPoint>;
  /** Draw the places around Carmona, grayed out, under the barangays. */
  neighbors?: boolean;
  /** Shapes to outline with a frame, marking where the inset is. */
  frame?: BarangayShape[];
  labelled: (shape: BarangayShape) => boolean;
  /** Label with the barangay's number only. */
  short?: boolean;
  title: string;
} & Pick<Props, 'active' | 'onPreview' | 'onSelect' | 'label'>) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { height, areas, around, frameBox } = useMemo(() => {
    // The places around Carmona run to the edges; the barangays alone get a margin.
    const pad = neighbors ? 0 : PAD;
    // The height that keeps the area's proportions at this width.
    const unit = geoPath(geoMercator().fitWidth(1000, fitTo)).bounds(fitTo);
    const ratio = (unit[1][1] - unit[0][1]) / (unit[1][0] - unit[0][0]);
    const height = Math.round((width - 2 * pad) * ratio + 2 * pad);
    const projection = geoMercator().fitExtent([[pad, pad], [width - pad, height - pad]], fitTo);
    const path = geoPath(projection);
    const around = neighbors ? NEIGHBORS.map((n) => ({ name: n.name, d: path(n.feature) ?? '', point: projection(n.label as [number, number]) ?? [0, 0] })) : [];
    // The neighbors' labels are fixed. Each barangay label takes its best point that doesn't overlap a
    // label already placed, smallest shapes first, since they have the fewest points to choose from.
    const placed: Box[] = around.map(({ name, point }) => boxAt(point as [number, number], lines(name), neighborSize(width)));
    const points = new Map<number, [number, number]>();
    for (const shape of [...BARANGAY_SHAPES].filter(labelled).sort((a, b) => a.labels.length - b.labels.length)) {
      const text = [short ? String(shape.barangay.number) : shape.barangay.name ?? `Barangay ${shape.barangay.number}`];
      const candidates = shape.labels.map((p): [number, number] => projection(p as [number, number]) ?? [0, 0]);
      const fits = (box: Box) => box[0] >= 0 && box[1] >= 0 && box[2] <= width && box[3] <= height && !placed.some((b) => overlaps(b, box));
      const point = candidates.find((p) => fits(boxAt(p, text, labelSize(width)))) ?? candidates[0];
      placed.push(boxAt(point, text, labelSize(width)));
      points.set(shape.barangay.number, point);
    }
    const areas = BARANGAY_SHAPES.map((shape) => ({ shape, d: path(shape.feature) ?? '', point: points.get(shape.barangay.number) }));
    const frameBox = frame && path.bounds(collectionOf(frame));
    return { height, areas, around, frameBox };
  }, [width, fitTo, neighbors, frame, labelled, short]);

  return (
    <div className={className} ref={container}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={title} onPointerLeave={() => onPreview(null)}>
        {around.map(({ name, d }) => <path key={name} d={d} className="barangay-map-neighbor" aria-hidden="true" />)}
        {areas.map(({ shape: { barangay }, d }) => (
          <path
            key={barangay.number}
            d={d}
            className={`barangay-map-area${active === barangay.number ? ' is-active' : ''}`}
            onClick={() => onSelect(barangay.number)}
            onPointerEnter={(event) => event.pointerType === 'mouse' && onPreview(barangay.number)}
          >
            <title>{label(barangay.number)}</title>
          </path>
        ))}
        {frameBox && (
          <rect
            className="barangay-map-frame"
            x={frameBox[0][0] - 3}
            y={frameBox[0][1] - 3}
            width={frameBox[1][0] - frameBox[0][0] + 6}
            height={frameBox[1][1] - frameBox[0][1] + 6}
          />
        )}
        {around.map(({ name, point }) => (
          <text key={name} className="barangay-map-neighbor-label" x={point[0]} y={point[1]} textAnchor="middle" dominantBaseline="central" aria-hidden="true" style={{ fontSize: neighborSize(width) }}>
            {lines(name).map((line, i, all) => (
              <tspan key={line} x={point[0]} dy={i === 0 ? `${-(all.length - 1) * 0.55}em` : '1.1em'}>{line}</tspan>
            ))}
          </text>
        ))}
        {areas.flatMap(({ shape: { barangay }, point }) => point ? [{ barangay, point }] : []).map(({ barangay, point }) => (
          <text
            key={barangay.number}
            className={`barangay-map-label${active === barangay.number ? ' is-active' : ''}`}
            x={point[0]}
            y={point[1]}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: labelSize(width) }}
          >
            {short ? barangay.number : barangay.name ?? label(barangay.number)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Long names on two lines, split at the space nearest the middle: "Gen. Mariano" over "Alvarez". */
function lines(name: string): string[] {
  if (name.length <= 12 || !name.includes(' ')) return [name];
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index);
  const at = spaces.reduce((best, i) => (Math.abs(i - name.length / 2) < Math.abs(best - name.length / 2) ? i : best));
  return [name.slice(0, at), name.slice(at + 1)];
}

const labelSize = (width: number) => (width < 480 ? 10.5 : 12);
const neighborSize = (width: number) => (width < 480 ? 10 : 11.5);
