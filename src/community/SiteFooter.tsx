import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortal } from '../lib/portal-context';
import { DIRECTORY_URL, OFFICIAL_PORTAL_URL, REPOSITORY_URL } from './links';
import { useLocale } from './locale';
import { NAVIGATION } from './navigation';

export function SiteFooter() {
  const { config } = usePortal();
  const { t, path } = useLocale();
  const links = [
    { key: 'footer.officialPortal', href: OFFICIAL_PORTAL_URL },
    { key: 'footer.repository', href: REPOSITORY_URL },
    { key: 'footer.directory', href: DIRECTORY_URL },
  ];
  const logo = config.logoDark ?? config.logo;
  return (
    <footer className="site-footer">
      <div className="page site-footer-inner">
        <div className="site-footer-brand">
          {logo && <img src={logo} alt="BetterCarmona" className="site-footer-logo" />}
          <p className="site-statement">{t('footer.statement')}</p>
        </div>
        <nav className="site-footer-column" aria-labelledby="site-footer-pages">
          <h2 id="site-footer-pages">{t('footer.pagesLabel')}</h2>
          <ul>
            {NAVIGATION.map(({ key, href }) => (
              <li key={href}><Link to={path(href)}>{t(key)}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="site-footer-column">
          <h2 id="site-footer-links">{t('footer.linksLabel')}</h2>
          <ul aria-labelledby="site-footer-links">
            {links.map(({ key, href }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener">
                  {t(key)} <ExternalLink size={14} aria-hidden="true" />
                  <span className="sr-only"> {t('opensInNewTab')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
