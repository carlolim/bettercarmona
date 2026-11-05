import { Link } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { ExternalLink } from './ExternalLink';
import { DIRECTORY_URL, ISSUES_URL, OFFICIAL_PORTAL_URL, REPOSITORY_URL } from './links';
import { useLocale } from './locale';

export function CommunityAbout() {
  const { t, path } = useLocale();
  useTitle(t('about.pageTitle'));
  return (
    <main className="page main community-about">
      <h1>{t('about.heading')}</h1>

      <section aria-labelledby="about-who">
        <h2 id="about-who">{t('about.who.heading')}</h2>
        <p>{t('about.who.body')}</p>
        <p>
          {t('about.who.official')}{' '}
          <ExternalLink href={OFFICIAL_PORTAL_URL}>{t('about.who.officialLink')}</ExternalLink>
        </p>
      </section>

      <section aria-labelledby="about-sources">
        <h2 id="about-sources">{t('about.sources.heading')}</h2>
        <p>{t('about.sources.body')}</p>
        <p>{t('about.sources.check')}</p>
        <p>
          {t('about.sources.budget')}{' '}
          <Link to={path('/transparency/about-the-data')}>{t('about.sources.budgetLink')}</Link>
        </p>
      </section>

      <section aria-labelledby="about-errors">
        <h2 id="about-errors">{t('about.errors.heading')}</h2>
        <p>{t('about.errors.body')}</p>
        <p><ExternalLink href={ISSUES_URL} className="button button-primary">{t('about.errors.link')}</ExternalLink></p>
        <p>{t('about.errors.note')}</p>
      </section>

      <section aria-labelledby="about-directory">
        <h2 id="about-directory">{t('about.directory.heading')}</h2>
        <p>{t('about.directory.body')}</p>
        <ul className="community-links">
          <li><ExternalLink href={DIRECTORY_URL}>{t('about.directory.link')}</ExternalLink></li>
          <li><ExternalLink href={REPOSITORY_URL}>{t('about.directory.repository')}</ExternalLink></li>
        </ul>
      </section>
    </main>
  );
}
