/**
 * "Ask BetterCarmona AI": a speech bubble with the letters AI and a sparkle at its corner. Drawn for this site in
 * Lucide's style (24px grid, 2px round strokes, currentColor), since Lucide has no such icon.
 */
export function AiChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13 4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h5l4 3.5V18a4 4 0 0 0 4-4v-3" />
      <path d="M7.6 14.5l2-6 2 6" />
      <path d="M8.3 12.5h2.6" />
      <path d="M14.7 8.5v6" />
      <path d="M19.5 1.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" strokeWidth={1} />
    </svg>
  );
}
