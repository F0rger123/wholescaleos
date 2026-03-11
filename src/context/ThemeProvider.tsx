// Theme Provider v2 - Fixed background mapping
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';

function applyTheme(themeId: string) {
  const theme = themes[themeId] || themes.dark;
  const root = document.documentElement;
  const customColors = useStore.getState().customColors;
  
  // Apply theme colors with custom overrides
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Map the property name to the correct CSS variable
    let cssVar: string;
    
    // Special mappings for commonly used variables
    if (key === 'background') {
      cssVar = '--t-bg'; // Map 'background' to '--t-bg'
    } else if (key === 'text') {
      cssVar = '--t-text'; // Already correct
    } else if (key === 'surface') {
      cssVar = '--t-surface'; // Already correct
    } else if (key === 'primary') {
      cssVar = '--t-primary'; // Already correct
    } else if (key === 'accent') {
      cssVar = '--t-accent'; // Already correct
    } else if (key === 'sidebarBg') {
      cssVar = '--t-sidebar-bg'; // Already correct
    } else if (key === 'sidebarBorder') {
      cssVar = '--t-sidebar-border'; // Already correct
    } else if (key === 'sidebarHover') {
      cssVar = '--t-sidebar-hover'; // Already correct
    } else if (key === 'inputBg') {
      cssVar = '--t-input-bg'; // Already correct
    } else if (key === 'inputBorder') {
      cssVar = '--t-input-border'; // Already correct
    } else if (key === 'inputFocus') {
      cssVar = '--t-input-focus'; // Already correct
    } else if (key === 'avatarFrom') {
      cssVar = '--t-avatar-from'; // Already correct
    } else if (key === 'avatarTo') {
      cssVar = '--t-avatar-to'; // Already correct
    } else {
      // For all other properties, convert camelCase to kebab-case
      cssVar = `--t-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    }
    
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

  // Also set convenience variables for common properties
  root.style.setProperty('--t-bg', customColors.background || theme.colors.background);
  root.style.setProperty('--t-on-primary', customColors.onPrimary || theme.colors.onPrimary || '#ffffff');
  root.style.setProperty('--t-on-surface', customColors.onSurface || theme.colors.onSurface || '#ffffff');
  root.style.setProperty('--t-on-background', customColors.onBackground || theme.colors.onBackground || '#ffffff');
  root.style.setProperty('--t-on-accent', customColors.onAccent || theme.colors.onAccent || '#000000');
  root.style.setProperty('--t-border-subtle', customColors.borderSubtle || theme.colors.borderSubtle || 'rgba(255,255,255,0.1)');
  root.style.setProperty('--t-border-strong', customColors.borderStrong || theme.colors.borderStrong || 'rgba(255,255,255,0.3)');
  root.style.setProperty('--t-success-dim', `${customColors.success || theme.colors.success}20`);
  root.style.setProperty('--t-warning-dim', `${customColors.warning || theme.colors.warning}20`);
  root.style.setProperty('--t-error-dim', `${customColors.error || theme.colors.error}20`);
  root.style.setProperty('--t-info-dim', `${customColors.info || theme.colors.info}20`);

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