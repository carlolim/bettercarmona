// Map drawing adapted from BetterCatanduanes (MIT). See THIRD_PARTY_NOTICES.md.
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BARANGAY_SHAPES, type BarangayShape } from './data/barangay-map';

const PAD = 12;

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
  return (
    <div className="barangay-map">
      <MapPanel
        className="barangay-map-city"
        fitTo={BARANGAY_SHAPES}
        frame={townCenter}
        labelled={(s) => !s.townCenter}
        title={cityLabel}
        {...{ active, onPreview, onSelect, label }}
      />
      <figure className="barangay-map-inset">
        <figcaption>{insetHeading}</figcaption>
        <MapPanel
          className="barangay-map-town"
          fitTo={townCenter}
          labelled={(s) => s.townCenter}
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

function MapPanel({ className, fitTo, frame, labelled, short, title, active, onPreview, onSelect, label }: {
  className: string;
  fitTo: BarangayShape[];
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

  const { height, areas, frameBox } = useMemo(() => {
    const target = collectionOf(fitTo);
    // The height that keeps the area's proportions at this width.
    const unit = geoPath(geoMercator().fitWidth(1000, target)).bounds(target);
    const ratio = (unit[1][1] - unit[0][1]) / (unit[1][0] - unit[0][0]);
    const height = Math.round((width - 2 * PAD) * ratio + 2 * PAD);
    const path = geoPath(geoMercator().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], target));
    const areas = BARANGAY_SHAPES.map((shape) => ({ shape, d: path(shape.feature) ?? '', point: path.centroid(shape.feature) }));
    const frameBox = frame && path.bounds(collectionOf(frame));
    return { height, areas, frameBox };
  }, [width, fitTo, frame]);

  return (
    <div className={className} ref={container}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={title} onPointerLeave={() => onPreview(null)}>
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
        {areas.filter(({ shape }) => labelled(shape)).map(({ shape: { barangay }, point }) => (
          <text
            key={barangay.number}
            className={`barangay-map-label${active === barangay.number ? ' is-active' : ''}`}
            x={point[0]}
            y={point[1]}
            textAnchor="middle"
            dominantBaseline="central"
            // Mabuhay and Milagrosa sit side by side; smaller labels keep them apart on a phone.
            style={{ fontSize: width < 480 ? 10.5 : 12 }}
          >
            {short ? barangay.number : barangay.name ?? label(barangay.number)}
          </text>
        ))}
      </svg>
    </div>
  );
}
