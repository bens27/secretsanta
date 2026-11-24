import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isThemeId, ThemeDefinition, ThemeId, THEMES } from '../themes';
import { ThemeBurst, ThemeParticles } from './ThemeParticles';

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeId: (id: ThemeId) => void;
  /** Shows a mode on the current page without changing the saved choice. */
  setOverrideId: (id: ThemeId | null) => void;
  /** Throws a burst of the mode's emoji across the screen. */
  celebrate: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.classic,
  setThemeId: () => {},
  setOverrideId: () => {},
  celebrate: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [savedId, setSavedId] = useLocalStorage<ThemeId>(
    'secretSantaTheme',
    'classic',
    value => isThemeId(value) ? value : 'classic',
  );
  const [overrideId, setOverrideId] = useState<ThemeId | null>(null);
  const [burst, setBurst] = useState(0);
  const themeId = overrideId ?? savedId;

  // Picking a mode from the menu ends any override.
  const setThemeId = useCallback((id: ThemeId) => {
    setOverrideId(null);
    setSavedId(id);
  }, [setSavedId]);

  // Page-wide styles (background, fonts, stripes) key off this attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const theme = THEMES[themeId];
  const celebrate = useCallback(() => setBurst(n => n + 1), []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, setOverrideId, celebrate }}>
      <ThemeParticles key={theme.id} theme={theme} />
      {burst > 0 && <ThemeBurst key={`${theme.id}-${burst}`} theme={theme} />}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Name of the gift exchange in the current mode ("Secret Santa" by default). */
export function useSanta() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const themed = (t(`themes.${theme.id}`, { returnObjects: true }) as { santa?: string }).santa;
  return themed || t('santa');
}
