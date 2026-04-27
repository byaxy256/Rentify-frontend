export type AppTheme = 'Light';
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
  applyResolvedTheme(false);
  localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  return () => {};
}

export function applyLanguagePreference(language: AppLanguage) {
  document.documentElement.lang = languageCodeMap[language] || 'en';
}

export function getStoredThemePreference(): AppTheme {
  return 'Light';
}

export function getStoredLanguagePreference(): AppLanguage {
  const value = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  if (value === 'Luganda' || value === 'Swahili' || value === 'English') {
    return value;
  }

  return 'English';
}
