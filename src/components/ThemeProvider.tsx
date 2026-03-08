import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';

function applyTheme(themeId: string) {
  const theme = themes[themeId] || themes.dark;
  const root = document.documentElement;
  const c = theme.colors;

  // Set all CSS custom properties
  root.style.setProperty('--t-primary', c.primary);
  root.style.setProperty('--t-primary-dim', c.primaryDim);
  root.style.setProperty('--t-primary-text', c.primaryText);
  root.style.setProperty('--t-secondary', c.secondary);
  root.style.setProperty('--t-accent', c.accent);
  root.style.setProperty('--t-bg', c.background);
  root.style.setProperty('--t-surface', c.surface);
  root.style.setProperty('--t-surface-hover', c.surfaceHover);
  root.style.setProperty('--t-surface-active', c.surfaceActive);
  root.style.setProperty('--t-text', c.text);
  root.style.setProperty('--t-text-secondary', c.textSecondary);
  root.style.setProperty('--t-text-muted', c.textMuted);
  root.style.setProperty('--t-border', c.border);
  root.style.setProperty('--t-border-light', c.borderLight);
  root.style.setProperty('--t-success', c.success);
  root.style.setProperty('--t-warning', c.warning);
  root.style.setProperty('--t-error', c.error);
  root.style.setProperty('--t-info', c.info);
  root.style.setProperty('--t-sidebar-bg', c.sidebarBg);
  root.style.setProperty('--t-sidebar-border', c.sidebarBorder);
  root.style.setProperty('--t-sidebar-hover', c.sidebarHover);
  root.style.setProperty('--t-input-bg', c.inputBg);
  root.style.setProperty('--t-input-border', c.inputBorder);
  root.style.setProperty('--t-input-focus', c.inputFocus);
  root.style.setProperty('--t-avatar-from', c.avatarFrom);
  root.style.setProperty('--t-avatar-to', c.avatarTo);
  root.style.setProperty('--t-glow', c.glow);
  root.style.setProperty('--t-radius', theme.effects.borderRadius);
  root.style.setProperty('--t-card-radius', theme.effects.cardRadius);
  root.style.setProperty('--t-glow-shadow', theme.effects.glowShadow);
  root.style.setProperty('--t-gradient', theme.effects.gradient);
  
  // Handle backdrop blur for glass theme
  if (theme.effects.backdropBlur) {
    root.style.setProperty('--t-backdrop-blur', theme.effects.backdropBlur);
  } else {
    root.style.setProperty('--t-backdrop-blur', 'none');
  }

  // Set data-theme attribute for CSS selectors
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-dark', theme.isDark ? 'true' : 'false');

  // Persist to localStorage
  localStorage.setItem('wholescale-theme', themeId);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const currentTheme = useStore((s) => s.currentTheme);

  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  return <>{children}</>;
}

// Initialize theme from localStorage on module load
export function getInitialTheme(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('wholescale-theme');
    if (saved && themes[saved]) return saved;
  }
  return 'dark';
}