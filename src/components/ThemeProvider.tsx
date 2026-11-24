import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isThemeId, ThemeDefinition, ThemeId, THEMES } from '../themes';
import { ThemeBurst, ThemeParticles } from './ThemeParticles';

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeId: (id: ThemeId) => void;
  /** Throws a burst of the mode's emoji across the screen. */
  celebrate: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.classic,
  setThemeId: () => {},
  celebrate: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useLocalStorage<ThemeId>(
    'secretSantaTheme',
    'classic',
    value => isThemeId(value) ? value : 'classic',
  );
  const [burst, setBurst] = useState(0);

  // Page-wide styles (background, fonts, stripes) key off this attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const theme = THEMES[themeId];
  const celebrate = useCallback(() => setBurst(n => n + 1), []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, celebrate }}>
      <ThemeParticles key={theme.id} theme={theme} />
      {burst > 0 && <ThemeBurst key={`${theme.id}-${burst}`} theme={theme} />}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
