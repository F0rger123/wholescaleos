export interface ThemeColors {
  primary: string;
  primaryDim: string;
  primaryText: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  // Presence
  online: string;
  busy: string;
  dnd: string;
  offline: string;
  // Priority
  high: string;
  medium: string;
  low: string;
  // Sidebar
  sidebarBg: string;
  sidebarBorder: string;
  sidebarHover: string;
  // Input
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  // Map
  mapTile: string;
  // Gradients
  avatarFrom: string;
  avatarTo: string;
  // Shadows
  glow: string;
}

export interface ThemeEffects {
  borderRadius: string;
  cardRadius: string;
  animation: string;
  glowShadow: string;
  gradient: string;
  backdropBlur?: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isDark: boolean;
  colors: ThemeColors;
  effects: ThemeEffects;
  preview: {
    sidebar: string;
    content: string;
    card: string;
    accent: string;
  };
}

export const themes: Record<string, Theme> = {
  // ===== EXISTING THEMES =====
  dark: {
    id: 'dark',
    name: 'Midnight',
    description: 'Default dark theme with blue accents',
    emoji: '🌙',
    isDark: true,
    colors: {
      primary: '#3b82f6',
      primaryDim: 'rgba(59, 130, 246, 0.2)',
      primaryText: '#60a5fa',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceHover: '#334155',
      surfaceActive: '#3b4d6b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      border: '#334155',
      borderLight: '#475569',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      online: '#10b981',
      busy: '#ef4444',
      dnd: '#f59e0b',
      offline: '#64748b',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: '#0f172a',
      sidebarBorder: '#1e293b',
      sidebarHover: '#1e293b',
      inputBg: '#1e293b',
      inputBorder: '#334155',
      inputFocus: '#3b82f6',
      mapTile: 'dark',
      avatarFrom: '#3b82f6',
      avatarTo: '#8b5cf6',
      glow: 'none',
    },
    effects: {
      borderRadius: '0.75rem',
      cardRadius: '1rem',
      animation: 'all 0.2s ease',
      glowShadow: 'none',
      gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    },
    preview: {
      sidebar: '#0f172a',
      content: '#1e293b',
      card: '#334155',
      accent: '#3b82f6',
    },
  },

  // ===== KEEP YOUR EXISTING NEON, MOON, GRADIENT, MINIMAL, SMOOTH THEMES HERE =====
  // (I'm not including them here to save space, but keep them in your file)

  // ===== NEW THEMES =====

  glass: {
    id: 'glass',
    name: 'iOS Glassmorphism',
    description: 'Frosted glass with blur effects and soft shadows',
    emoji: '✨',
    isDark: true,
    colors: {
      primary: 'rgba(59, 130, 246, 0.9)',
      primaryDim: 'rgba(59, 130, 246, 0.2)',
      primaryText: '#60a5fa',
      secondary: 'rgba(99, 102, 241, 0.9)',
      accent: 'rgba(139, 92, 246, 0.9)',
      background: 'rgba(15, 23, 42, 0.8)',
      surface: 'rgba(30, 41, 59, 0.7)',
      surfaceHover: 'rgba(51, 65, 85, 0.8)',
      surfaceActive: 'rgba(59, 77, 107, 0.8)',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      border: 'rgba(255, 255, 255, 0.1)',
      borderLight: 'rgba(255, 255, 255, 0.05)',
      success: 'rgba(16, 185, 129, 0.9)',
      warning: 'rgba(245, 158, 11, 0.9)',
      error: 'rgba(239, 68, 68, 0.9)',
      info: 'rgba(59, 130, 246, 0.9)',
      online: 'rgba(16, 185, 129, 0.9)',
      busy: 'rgba(239, 68, 68, 0.9)',
      dnd: 'rgba(245, 158, 11, 0.9)',
      offline: '#64748b',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: 'rgba(15, 23, 42, 0.7)',
      sidebarBorder: 'rgba(255, 255, 255, 0.05)',
      sidebarHover: 'rgba(30, 41, 59, 0.8)',
      inputBg: 'rgba(30, 41, 59, 0.6)',
      inputBorder: 'rgba(255, 255, 255, 0.1)',
      inputFocus: '#3b82f6',
      mapTile: 'dark',
      avatarFrom: 'rgba(59, 130, 246, 0.9)',
      avatarTo: 'rgba(139, 92, 246, 0.9)',
      glow: '0 0 20px rgba(59, 130, 246, 0.2)',
    },
    effects: {
      borderRadius: '1rem',
      cardRadius: '1.25rem',
      animation: 'all 0.3s ease',
      glowShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))',
      backdropBlur: 'blur(12px)',
    },
    preview: {
      sidebar: 'rgba(15, 23, 42, 0.7)',
      content: 'rgba(30, 41, 59, 0.6)',
      card: 'rgba(51, 65, 85, 0.6)',
      accent: '#3b82f6',
    },
  },

  light: {
    id: 'light',
    name: 'Default Light',
    description: 'Clean white with subtle grays, professional look',
    emoji: '☀️',
    isDark: false,
    colors: {
      primary: '#2563eb',
      primaryDim: 'rgba(37, 99, 235, 0.1)',
      primaryText: '#2563eb',
      secondary: '#6b7280',
      accent: '#7c3aed',
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceHover: '#f1f5f9',
      surfaceActive: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      border: '#e2e8f0',
      borderLight: '#cbd5e1',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb',
      online: '#059669',
      busy: '#dc2626',
      dnd: '#7c3aed',
      offline: '#9ca3af',
      high: '#dc2626',
      medium: '#d97706',
      low: '#059669',
      sidebarBg: '#ffffff',
      sidebarBorder: '#e2e8f0',
      sidebarHover: '#f1f5f9',
      inputBg: '#f8fafc',
      inputBorder: '#d1d5db',
      inputFocus: '#2563eb',
      mapTile: 'light',
      avatarFrom: '#2563eb',
      avatarTo: '#7c3aed',
      glow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    effects: {
      borderRadius: '0.5rem',
      cardRadius: '0.75rem',
      animation: 'all 0.15s ease',
      glowShadow: '0 1px 3px rgba(0,0,0,0.1)',
      gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    },
    preview: {
      sidebar: '#ffffff',
      content: '#f1f5f9',
      card: '#ffffff',
      accent: '#2563eb',
    },
  },

  blackMarble: {
    id: 'black-marble',
    name: 'Black Marble',
    description: 'Luxurious black with subtle white veining',
    emoji: '⚫',
    isDark: true,
    colors: {
      primary: '#ffffff',
      primaryDim: 'rgba(255, 255, 255, 0.1)',
      primaryText: '#ffffff',
      secondary: '#cccccc',
      accent: '#e0e0e0',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      surfaceHover: '#252525',
      surfaceActive: '#303030',
      text: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#999999',
      border: '#333333',
      borderLight: '#2a2a2a',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#ffffff',
      online: '#10b981',
      busy: '#ef4444',
      dnd: '#f59e0b',
      offline: '#666666',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: '#0a0a0a',
      sidebarBorder: '#1a1a1a',
      sidebarHover: '#1a1a1a',
      inputBg: '#1a1a1a',
      inputBorder: '#333333',
      inputFocus: '#ffffff',
      mapTile: 'dark',
      avatarFrom: '#ffffff',
      avatarTo: '#cccccc',
      glow: '0 0 20px rgba(255, 255, 255, 0.05)',
    },
    effects: {
      borderRadius: '0.75rem',
      cardRadius: '1rem',
      animation: 'all 0.2s ease',
      glowShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #ffffff, #cccccc)',
    },
    preview: {
      sidebar: '#0a0a0a',
      content: '#1a1a1a',
      card: '#252525',
      accent: '#ffffff',
    },
  },

  whiteMarble: {
    id: 'white-marble',
    name: 'White Marble',
    description: 'Elegant white with soft gray veining',
    emoji: '⚪',
    isDark: false,
    colors: {
      primary: '#1a1a1a',
      primaryDim: 'rgba(26, 26, 26, 0.1)',
      primaryText: '#1a1a1a',
      secondary: '#4a4a4a',
      accent: '#6b6b6b',
      background: '#f5f5f5',
      surface: '#ffffff',
      surfaceHover: '#f0f0f0',
      surfaceActive: '#e8e8e8',
      text: '#1a1a1a',
      textSecondary: '#4a4a4a',
      textMuted: '#6b6b6b',
      border: '#d4d4d4',
      borderLight: '#e8e8e8',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#1a1a1a',
      online: '#059669',
      busy: '#dc2626',
      dnd: '#7c3aed',
      offline: '#9ca3af',
      high: '#dc2626',
      medium: '#d97706',
      low: '#059669',
      sidebarBg: '#f5f5f5',
      sidebarBorder: '#e0e0e0',
      sidebarHover: '#f0f0f0',
      inputBg: '#fafafa',
      inputBorder: '#e0e0e0',
      inputFocus: '#1a1a1a',
      mapTile: 'light',
      avatarFrom: '#1a1a1a',
      avatarTo: '#4a4a4a',
      glow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    effects: {
      borderRadius: '0.75rem',
      cardRadius: '1rem',
      animation: 'all 0.2s ease',
      glowShadow: '0 2px 10px rgba(0,0,0,0.03)',
      gradient: 'linear-gradient(135deg, #1a1a1a, #4a4a4a)',
    },
    preview: {
      sidebar: '#f5f5f5',
      content: '#ffffff',
      card: '#ffffff',
      accent: '#1a1a1a',
    },
  },

  oled: {
    id: 'oled',
    name: 'OLED Black',
    description: 'Pure black for battery saving on OLED screens',
    emoji: '⬛',
    isDark: true,
    colors: {
      primary: '#3b82f6',
      primaryDim: 'rgba(59, 130, 246, 0.2)',
      primaryText: '#60a5fa',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: '#000000',
      surface: '#0a0a0a',
      surfaceHover: '#121212',
      surfaceActive: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#bbbbbb',
      textMuted: '#777777',
      border: '#1a1a1a',
      borderLight: '#0f0f0f',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      online: '#10b981',
      busy: '#ef4444',
      dnd: '#f59e0b',
      offline: '#444444',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: '#000000',
      sidebarBorder: '#0a0a0a',
      sidebarHover: '#0a0a0a',
      inputBg: '#0a0a0a',
      inputBorder: '#1a1a1a',
      inputFocus: '#3b82f6',
      mapTile: 'dark',
      avatarFrom: '#3b82f6',
      avatarTo: '#8b5cf6',
      glow: '0 0 10px rgba(59, 130, 246, 0.2)',
    },
    effects: {
      borderRadius: '0.5rem',
      cardRadius: '0.75rem',
      animation: 'all 0.15s ease',
      glowShadow: '0 1px 3px rgba(0,0,0,0.8)',
      gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    },
    preview: {
      sidebar: '#000000',
      content: '#0a0a0a',
      card: '#121212',
      accent: '#3b82f6',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue-black with purple undertones',
    emoji: '🌃',
    isDark: true,
    colors: {
      primary: '#4299e1',
      primaryDim: 'rgba(66, 153, 225, 0.2)',
      primaryText: '#63b3ed',
      secondary: '#9f7aea',
      accent: '#ed64a6',
      background: '#0b1120',
      surface: '#141b2b',
      surfaceHover: '#1e293b',
      surfaceActive: '#2d3748',
      text: '#e2e8f0',
      textSecondary: '#a0aec0',
      textMuted: '#718096',
      border: '#2d3748',
      borderLight: '#1e2937',
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
      info: '#4299e1',
      online: '#48bb78',
      busy: '#f56565',
      dnd: '#ed64a6',
      offline: '#718096',
      high: '#f56565',
      medium: '#ed8936',
      low: '#48bb78',
      sidebarBg: '#0b1120',
      sidebarBorder: '#1a2635',
      sidebarHover: '#141b2b',
      inputBg: '#141b2b',
      inputBorder: '#2d3748',
      inputFocus: '#4299e1',
      mapTile: 'dark',
      avatarFrom: '#4299e1',
      avatarTo: '#9f7aea',
      glow: '0 0 20px rgba(66, 153, 225, 0.15)',
    },
    effects: {
      borderRadius: '0.75rem',
      cardRadius: '1rem',
      animation: 'all 0.2s ease',
      glowShadow: '0 4px 20px rgba(0,0,0,0.5)',
      gradient: 'linear-gradient(135deg, #4299e1, #9f7aea)',
    },
    preview: {
      sidebar: '#0b1120',
      content: '#141b2b',
      card: '#1e293b',
      accent: '#4299e1',
    },
  },
};

// Update themeOrder to include all your themes
export const themeOrder = [
  'dark',      // Midnight (default)
  'light',     // Default Light
  'glass',     // iOS Glassmorphism
  'oled',      // OLED Black
  'midnight',  // Midnight Blue
  'black-marble', // Black Marble
  'white-marble', // White Marble
  'neon',      // Neon (your existing)
  'moon',      // Moonlight (your existing)
  'gradient',  // Aurora (your existing)
  'minimal',   // Clean Light (your existing)
  'smooth',    // Ocean (your existing)
] as const;

export type ThemeId = typeof themeOrder[number];