import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { HotlinesContent } from './HotlinesContent';
import { useLocale } from './locale';
import { PageHero } from './PageHero';

export function CommunityHotlines() {
  const { locale, t } = useLocale();
  const { hash } = useLocation();
  useTitle(t('hotlines.pageTitle'));
  // The barangay directory links to a barangay's row.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <main className="main community-page community-hotlines">
      <PageHero title={t('hotlines.heading')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('nav.hotlines') }]} />
      <div className="page">
        <HotlinesContent t={(key, values) => t(key, values ?? {})} locale={locale} />
      </div>
    </main>
  );
}
