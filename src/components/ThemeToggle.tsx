import { useEffect, useState } from 'react';
import { useLocale } from '../community/locale';

type Theme = 'light' | 'dark';

// Keep in step with the script in index.html, which sets the theme before first paint.
const STORAGE_KEY = 'bettercarmona-theme';

function readChoice(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function saveChoice(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked. The choice then lasts until the page is closed.
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1a16' : '#037951');
}

export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [choice, setChoice] = useState<Theme | null>(readChoice);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (choice) return;
    const device = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => setTheme(device.matches ? 'dark' : 'light');
    device.addEventListener('change', follow);
    return () => device.removeEventListener('change', follow);
  }, [choice]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        saveChoice(next);
        setChoice(next);
        setTheme(next);
      }}
    >
      {next === 'dark' ? t('theme.dark') : t('theme.light')}
    </button>
  );
}
