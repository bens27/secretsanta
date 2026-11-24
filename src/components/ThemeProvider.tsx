import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isThemeId, ThemeDefinition, ThemeId, THEMES } from '../themes';
import { ThemeParticles } from './ThemeParticles';

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.classic,
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useLocalStorage<ThemeId>(
    'secretSantaTheme',
    'classic',
    value => isThemeId(value) ? value : 'classic',
  );

  // Page-wide styles (background, fonts, stripes) key off this attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const theme = THEMES[themeId];

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      <ThemeParticles key={theme.id} theme={theme} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
