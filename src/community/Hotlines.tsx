import { useTitle } from '../lib/use-title';
import { HotlinesContent } from './HotlinesContent';
import { useLocale } from './locale';

export function CommunityHotlines() {
  const { locale, t } = useLocale();
  useTitle(t('hotlines.pageTitle'));
  return (
    <main className="page main community-hotlines">
      <HotlinesContent t={(key, values) => t(key, values ?? {})} locale={locale} />
    </main>
  );
}
