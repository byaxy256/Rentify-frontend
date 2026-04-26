export type AppTheme = 'System' | 'Light' | 'Dark';
export type AppLanguage = 'English' | 'Luganda' | 'Swahili';

export const APP_THEME_STORAGE_KEY = 'app:theme';
export const APP_LANGUAGE_STORAGE_KEY = 'app:language';

const languageCodeMap: Record<AppLanguage, string> = {
  English: 'en',
  Luganda: 'lg',
  Swahili: 'sw',
};

function applyResolvedTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function applyThemePreference(theme: AppTheme): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = () => {
    if (theme === 'Dark') {
      applyResolvedTheme(true);
      return;
    }

    if (theme === 'Light') {
      applyResolvedTheme(false);
      return;
    }

    applyResolvedTheme(media.matches);
  };

  apply();

  if (theme !== 'System') {
    return () => {};
  }

  const listener = () => apply();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

export function applyLanguagePreference(language: AppLanguage) {
  document.documentElement.lang = languageCodeMap[language] || 'en';
}

export function getStoredThemePreference(): AppTheme {
  const value = localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (value === 'Light' || value === 'Dark' || value === 'System') {
    return value;
  }

  return 'System';
}

export function getStoredLanguagePreference(): AppLanguage {
  const value = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  if (value === 'Luganda' || value === 'Swahili' || value === 'English') {
    return value;
  }

  return 'English';
}
