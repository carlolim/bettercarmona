import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { useLocale } from './locale';
import { SiteFooter } from './SiteFooter';

// Before task 004 the budget list lived at `/`, so filtered links to it may be in the wild.
const OLD_BUDGET_HASHES = ['#offices', '#projects'];

export function CommunityHome() {
  const { search, hash } = useLocation();
  const { t, path } = useLocale();
  useTitle(t('home.title'));
  if (search || OLD_BUDGET_HASHES.includes(hash)) {
    return <Navigate replace to={{ pathname: path('/transparency'), search, hash }} />;
  }
  return (
    <main className="page main community-home">
      <h1>{t('home.title')}</h1>
      <p className="lede">{t('home.intro')}</p>
      <p><Link to={path('/transparency')} className="button button-primary">{t('home.budgetLink')}</Link></p>
    </main>
  );
}

export function CommunityNotFound() {
  const { t, path } = useLocale();
  return (
    <>
      <div id="main-content" tabIndex={-1} className="site-content">
        <main className="page main">
          <p className="state">{t('notFound.message')} <Link to={path('/')}>{t('notFound.homeLink')}</Link></p>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
