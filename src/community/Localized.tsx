import { useLocale } from './locale';

/** Content written for the site. English is required, so nothing is ever blank. */
export interface LocalizedString {
  en: string;
  fil?: string;
}

/** Shows the Filipino text on `/fil` pages, or marks the English fallback as English. */
export function Localized({ value }: { value: LocalizedString }) {
  const { locale } = useLocale();
  if (locale === 'en') return <>{value.en}</>;
  return value.fil ? <>{value.fil}</> : <span lang="en">{value.en}</span>;
}
