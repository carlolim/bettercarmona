// Layout adapted from BetterCatanduanes (MIT). See THIRD_PARTY_NOTICES.md.
import { useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { usePortal } from '../lib/portal-context';
import { LanguageSwitch } from './LanguageSwitch';
import { OFFICIAL_PORTAL_URL } from './links';
import { stripLocale, useLocale } from './locale';

// Later tasks add Services and Government as their pages are built.
const NAVIGATION = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.hotlines', href: '/hotlines' },
  { key: 'nav.barangays', href: '/barangays' },
  { key: 'nav.transparency', href: '/transparency' },
  { key: 'nav.about', href: '/about' },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const { config } = usePortal();
  const { locale, t, path } = useLocale();
  const menu = useRef<HTMLDetailsElement>(null);
  const today = useMemo(() => {
    const now = new Date();
    return {
      label: new Intl.DateTimeFormat(locale === 'fil' ? 'fil-PH' : 'en-PH', {
        timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      }).format(now),
      value: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
    };
  }, [locale]);
  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };
  const page = stripLocale(pathname);
  const links = NAVIGATION.map(({ key, href }) => {
    const active = page === href || (href !== '/' && page.startsWith(`${href}/`));
    return <Link key={href} to={path(href)} aria-current={active ? 'page' : undefined} onClick={closeMenu}>{t(key)}</Link>;
  });

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-link">{t('skipToContent')}</a>
      <div className="site-utility">
        <div className="page site-utility-inner">
          <time dateTime={today.value}>{today.label}</time>
          <div className="site-utility-actions">
            <a href={OFFICIAL_PORTAL_URL} target="_blank" rel="noopener" className="site-official">
              {t('officialSite')} <span aria-hidden="true">↗</span>
              <span className="sr-only"> {t('opensInNewTab')}</span>
            </a>
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </div>
      <div className="page site-header-inner">
        <Link to={path('/')} className="site-brand" aria-label={t('brand')} onClick={closeMenu}>
          {config.logo && <img src={config.logo} alt="" className={`masthead-logo${config.logoDark ? ' masthead-logo-light' : ''}`} />}
          {config.logo && config.logoDark && <img src={config.logoDark} alt="" className="masthead-logo masthead-logo-dark" />}
        </Link>
        <nav className="site-nav" aria-label={t('nav.label')}>{links}</nav>
        <details
          ref={menu}
          className="site-nav-mobile"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeMenu();
              menu.current?.querySelector('summary')?.focus();
            }
          }}
        >
          <summary>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            <span className="sr-only">{t('nav.openMenu')}</span>
          </summary>
          <nav aria-label={t('nav.mobileLabel')}>{links}</nav>
        </details>
      </div>
    </header>
  );
}
