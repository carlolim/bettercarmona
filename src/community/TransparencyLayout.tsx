import { Outlet } from 'react-router-dom';
import { Footer, Masthead } from '../components/Chrome';
import { configProblems } from '../config';
import { usePortal } from '../lib/portal-context';
import { useLocale } from './locale';
import { SiteFooter } from './SiteFooter';

/** The upstream budget pages. They stay in English, so they're marked as English on `/fil` paths too. */
export function TransparencyLayout() {
  const { config } = usePortal();
  const { locale, t } = useLocale();
  const problems = import.meta.env.DEV ? configProblems(config) : [];
  return (
    <>
      <div lang="en" className="site-content-group">
        <Masthead />
        {locale === 'fil' && <p className="page budget-language-note" lang="fil">{t('budgetLanguageNote')}</p>}
        {problems.length > 0 && (
          <div className="page config-warning" role="alert">
            <strong>portal.config.ts needs attention</strong> (shown in development only):
            <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <div id="main-content" tabIndex={-1} className="site-content"><Outlet /></div>
        <Footer />
      </div>
      <SiteFooter />
    </>
  );
}
