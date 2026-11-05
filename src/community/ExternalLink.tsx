import type { ReactNode } from 'react';
import { useLocale } from './locale';

/** A link that leaves the site: opens in a new tab, and says so visually and to screen readers. */
export function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children} <span aria-hidden="true">↗</span>
      <span className="sr-only"> {t('opensInNewTab')}</span>
    </a>
  );
}
