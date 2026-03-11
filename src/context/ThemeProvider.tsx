import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';

function applyTheme(themeId: string) {
  const theme = themes[themeId] || themes.dark;
  const root = document.documentElement;
  const customColors = useStore.getState().customColors;
  
  // Apply theme colors with custom overrides
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--t-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    // Use custom color if it exists, otherwise use theme default
    root.style.setProperty(cssVar, customColors[key] || value as string);
  });

  // Set effects
  root.style.setProperty('--t-radius', theme.effects.borderRadius);
  root.style.setProperty('--t-card-radius', theme.effects.cardRadius);
  root.style.setProperty('--t-glow-shadow', theme.effects.glowShadow);
  root.style.setProperty('--t-gradient', theme.effects.gradient);
  
  if (theme.effects.backdropBlur) {
    root.style.setProperty('--t-backdrop-blur', theme.effects.backdropBlur);
  }

  // Set data-theme attribute
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-dark', theme.isDark ? 'true' : 'false');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentTheme, customColors } = useStore();

  // Apply on mount and when theme or custom colors change
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, customColors]);

  return <>{children}</>;
}
