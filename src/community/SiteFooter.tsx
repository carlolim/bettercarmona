import { DIRECTORY_URL, OFFICIAL_PORTAL_URL, REPOSITORY_URL } from './links';
import { useLocale } from './locale';

export function SiteFooter() {
  const { t } = useLocale();
  const links = [
    { key: 'footer.officialPortal', href: OFFICIAL_PORTAL_URL },
    { key: 'footer.repository', href: REPOSITORY_URL },
    { key: 'footer.directory', href: DIRECTORY_URL },
  ];
  return (
    <footer className="site-footer">
      <div className="page site-footer-inner">
        <p className="site-statement">{t('footer.statement')}</p>
        <ul className="site-footer-links" aria-label={t('footer.linksLabel')}>
          {links.map(({ key, href }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener">
                {t(key)} <span aria-hidden="true">↗</span>
                <span className="sr-only"> {t('opensInNewTab')}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
