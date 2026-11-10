import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from './locale';

/**
 * A link that leaves the site: opens in a new tab, and says so visually and to screen readers.
 * `icon` swaps the arrow glyph for the external-link icon, for links styled as buttons.
 */
export function ExternalLink({ href, className, icon, children }: { href: string; className?: string; icon?: boolean; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children} {icon ? <ExternalLinkIcon size={15} aria-hidden="true" /> : <span aria-hidden="true">↗</span>}
      <span className="sr-only"> {t('opensInNewTab')}</span>
    </a>
  );
}
