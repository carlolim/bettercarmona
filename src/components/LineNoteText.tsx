import { lineNote, shortNameOf } from '../config';
import { usePortal } from '../lib/portal-context';

/** The maintainer's published note on a kept line, if it has one. */
export function LineNoteText({ lineKey }: { lineKey: string }) {
  const { config } = usePortal();
  const found = lineNote(config, lineKey);
  if (!found) return null;
  return (
    <span className="line-note">
      {found.shareUnknown && <span className="tag tag-warn">{shortNameOf(config)}’s share unknown</span>}
      <span>{found.note}</span>
    </span>
  );
}
