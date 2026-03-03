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

  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk-inspired with neon green highlights',
    emoji: '⚡',
    isDark: true,
    colors: {
      primary: '#00ff9d',
      primaryDim: 'rgba(0, 255, 157, 0.15)',
      primaryText: '#00ff9d',
      secondary: '#00b8ff',
      accent: '#ff00e5',
      background: '#0a0a0f',
      surface: '#12121e',
      surfaceHover: '#1a1a2e',
      surfaceActive: '#252540',
      text: '#ffffff',
      textSecondary: '#a0a0c0',
      textMuted: '#606080',
      border: '#1f1f35',
      borderLight: '#2a2a45',
      success: '#00ff9d',
      warning: '#ffd600',
      error: '#ff3d3d',
      info: '#00b8ff',
      online: '#00ff9d',
      busy: '#ff3d3d',
      dnd: '#ff00e5',
      offline: '#606080',
      high: '#ff3d3d',
      medium: '#ffd600',
      low: '#00ff9d',
      sidebarBg: '#08080d',
      sidebarBorder: '#1a1a30',
      sidebarHover: '#15152a',
      inputBg: '#12121e',
      inputBorder: '#1f1f35',
      inputFocus: '#00ff9d',
      mapTile: 'dark',
      avatarFrom: '#00ff9d',
      avatarTo: '#00b8ff',
      glow: '0 0 15px rgba(0, 255, 157, 0.3)',
    },
    effects: {
      borderRadius: '0.5rem',
      cardRadius: '0.75rem',
      animation: 'all 0.15s ease',
      glowShadow: '0 0 20px rgba(0, 255, 157, 0.15)',
      gradient: 'linear-gradient(135deg, #00ff9d, #00b8ff)',
    },
    preview: {
      sidebar: '#08080d',
      content: '#12121e',
      card: '#1a1a2e',
      accent: '#00ff9d',
    },
  },

  moon: {
    id: 'moon',
    name: 'Moonlight',
    description: 'Soft purple tones with warm accents',
    emoji: '🔮',
    isDark: true,
    colors: {
      primary: '#7c3aed',
      primaryDim: 'rgba(124, 58, 237, 0.2)',
      primaryText: '#a78bfa',
      secondary: '#c084fc',
      accent: '#f472b6',
      background: '#0f0f1a',
      surface: '#1a1a2e',
      surfaceHover: '#252542',
      surfaceActive: '#302e55',
      text: '#e8e0ff',
      textSecondary: '#a0a0c8',
      textMuted: '#6b6b90',
      border: '#2a2a48',
      borderLight: '#3a3a5e',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#818cf8',
      online: '#10b981',
      busy: '#ef4444',
      dnd: '#f472b6',
      offline: '#6b7280',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: '#0d0d16',
      sidebarBorder: '#1f1f38',
      sidebarHover: '#1f1f38',
      inputBg: '#1a1a2e',
      inputBorder: '#2a2a48',
      inputFocus: '#7c3aed',
      mapTile: 'dark',
      avatarFrom: '#7c3aed',
      avatarTo: '#ec4899',
      glow: '0 0 20px rgba(124, 58, 237, 0.2)',
    },
    effects: {
      borderRadius: '1rem',
      cardRadius: '1.25rem',
      animation: 'all 0.3s ease',
      glowShadow: '0 0 30px rgba(124, 58, 237, 0.1)',
      gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)',
    },
    preview: {
      sidebar: '#0d0d16',
      content: '#1a1a2e',
      card: '#252542',
      accent: '#7c3aed',
    },
  },

  gradient: {
    id: 'gradient',
    name: 'Aurora',
    description: 'Multi-color gradients with deep backgrounds',
    emoji: '🌈',
    isDark: true,
    colors: {
      primary: '#06b6d4',
      primaryDim: 'rgba(6, 182, 212, 0.2)',
      primaryText: '#22d3ee',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#0c1222',
      surface: '#141c30',
      surfaceHover: '#1c2840',
      surfaceActive: '#253450',
      text: '#f0f4ff',
      textSecondary: '#a8b8d0',
      textMuted: '#607090',
      border: '#1e2d44',
      borderLight: '#2a3d58',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      online: '#10b981',
      busy: '#ef4444',
      dnd: '#ec4899',
      offline: '#64748b',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      sidebarBg: '#0a0f1c',
      sidebarBorder: '#1a2540',
      sidebarHover: '#152035',
      inputBg: '#141c30',
      inputBorder: '#1e2d44',
      inputFocus: '#06b6d4',
      mapTile: 'dark',
      avatarFrom: '#06b6d4',
      avatarTo: '#ec4899',
      glow: '0 0 20px rgba(6, 182, 212, 0.15)',
    },
    effects: {
      borderRadius: '0.75rem',
      cardRadius: '1rem',
      animation: 'all 0.25s ease',
      glowShadow: '0 4px 20px rgba(6, 182, 212, 0.1)',
      gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)',
    },
    preview: {
      sidebar: '#0a0f1c',
      content: '#141c30',
      card: '#1c2840',
      accent: '#06b6d4',
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Clean Light',
    description: 'Minimal light theme for bright environments',
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
      glow: 'none',
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

  smooth: {
    id: 'smooth',
    name: 'Ocean',
    description: 'Cool ocean tones with rounded elements',
    emoji: '🌊',
    isDark: false,
    colors: {
      primary: '#0891b2',
      primaryDim: 'rgba(8, 145, 178, 0.12)',
      primaryText: '#0891b2',
      secondary: '#14b8a6',
      accent: '#f43f5e',
      background: '#f0f9ff',
      surface: '#ffffff',
      surfaceHover: '#ecfeff',
      surfaceActive: '#cffafe',
      text: '#0c4a6e',
      textSecondary: '#0369a1',
      textMuted: '#7dd3fc',
      border: '#bae6fd',
      borderLight: '#7dd3fc',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0891b2',
      online: '#059669',
      busy: '#dc2626',
      dnd: '#f43f5e',
      offline: '#94a3b8',
      high: '#dc2626',
      medium: '#d97706',
      low: '#059669',
      sidebarBg: '#f0f9ff',
      sidebarBorder: '#bae6fd',
      sidebarHover: '#e0f2fe',
      inputBg: '#f0f9ff',
      inputBorder: '#bae6fd',
      inputFocus: '#0891b2',
      mapTile: 'light',
      avatarFrom: '#0891b2',
      avatarTo: '#14b8a6',
      glow: '0 4px 15px rgba(8, 145, 178, 0.15)',
    },
    effects: {
      borderRadius: '1rem',
      cardRadius: '1.5rem',
      animation: 'all 0.3s ease',
      glowShadow: '0 4px 20px rgba(8, 145, 178, 0.1)',
      gradient: 'linear-gradient(135deg, #0891b2, #14b8a6)',
    },
    preview: {
      sidebar: '#f0f9ff',
      content: '#ecfeff',
      card: '#ffffff',
      accent: '#0891b2',
    },
  },
};

export const themeOrder = ['dark', 'neon', 'moon', 'gradient', 'minimal', 'smooth'] as const;
export type ThemeId = typeof themeOrder[number];
