import { RouterProvider } from 'react-router';
import { useEffect } from 'react';
import { router } from './routes';
import { Toaster } from 'sonner';
import {
  applyLanguagePreference,
  applyThemePreference,
  getStoredLanguagePreference,
  getStoredThemePreference,
} from './lib/preferences';

export default function App() {
  useEffect(() => {
    const theme = getStoredThemePreference();
    const language = getStoredLanguagePreference();

    const cleanupThemeListener = applyThemePreference(theme);
    applyLanguagePreference(language);

    return cleanupThemeListener;
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}
