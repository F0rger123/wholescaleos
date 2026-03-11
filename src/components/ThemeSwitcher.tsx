import { useState } from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';
import { Palette, Sparkles, RotateCcw, X } from 'lucide-react';

export function ThemeSwitcher() {
  const { currentTheme, setTheme, customColors, setCustomColor, resetCustomColors } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customizer'>('presets');
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  const currentThemeData = themes[currentTheme] || themes.dark;

  // Group themes by category for better organization
  const themeCategories = {
    'Default': ['dark', 'light'],
    'Premium': ['glass', 'oled', 'midnight', 'black-marble', 'white-marble'],
    'Neon & Creative': ['neon', 'moon', 'aurora', 'cyberpunk'],
    'Luxury': ['platinum', 'rose-gold', 'charcoal'],
    'Minimalist': ['slate', 'ivory', 'winter-frost'],
  };

  // Get theme icon based on ID
  const getThemeIcon = (themeId: string) => {
    const icons: Record<string, string> = {
      'dark': '🌙',
      'light': '☀️',
      'glass': '✨',
      'oled': '⬛',
      'midnight': '🌃',
      'black-marble': '⚫',
      'white-marble': '⚪',
      'neon': '💚',
      'moon': '🌕',
      'platinum': '💎',
      'rose-gold': '✨',
      'charcoal': '⚙️',
      'aurora': '✨',
      'cyberpunk': '🌃',
      'slate': '📱',
      'ivory': '🤍',
      'winter-frost': '❄️',
    };
    return icons[themeId] || '🎨';
  };

  return (
    <div className="relative">
      {/* Theme Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: 'var(--t-surface)',
          color: 'var(--t-text)',
          border: '1px solid var(--t-border)',
        }}
      >
        <span className="text-xl">{getThemeIcon(currentTheme)}</span>
        <span className="text-sm font-medium hidden sm:inline">{currentThemeData.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme Picker */}
          <div 
            className="absolute right-0 mt-2 w-96 max-h-[80vh] overflow-hidden rounded-xl shadow-2xl z-50 border flex flex-col"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              boxShadow: 'var(--t-glow-shadow)',
            }}
          >
            {/* Header with Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--t-border)' }}>
              <button
                onClick={() => setActiveTab('presets')}
                className="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                style={{
                  color: activeTab === 'presets' ? 'var(--t-primary)' : 'var(--t-text-muted)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Palette size={16} />
                  Preset Themes
                </div>
                {activeTab === 'presets' && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--t-primary)' }}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('customizer')}
                className="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                style={{
                  color: activeTab === 'customizer' ? 'var(--t-primary)' : 'var(--t-text-muted)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles size={16} />
                  Custom Colors
                </div>
                {activeTab === 'customizer' && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--t-primary)' }}
                  />
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: '500px' }}>
              {activeTab === 'presets' ? (
                /* PRESET THEMES TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                      Theme Gallery
                    </h3>
                    <span className="text-xs px-2 py-1 rounded" style={{ 
                      backgroundColor: 'var(--t-primary-dim)',
                      color: 'var(--t-primary-text)'
                    }}>
                      {Object.keys(themes).length} themes
                    </span>
                  </div>
                  
                  {/* Categories */}
                  {Object.entries(themeCategories).map(([category, themeIds]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {themeIds.map((themeId) => {
                          const theme = themes[themeId];
                          if (!theme) return null;
                          
                          const isActive = currentTheme === themeId;
                          const isHovered = hoveredTheme === themeId;
                          
                          return (
                            <button
                              key={themeId}
                              onClick={() => {
                                setTheme(themeId);
                                setIsOpen(false);
                              }}
                              onMouseEnter={() => setHoveredTheme(themeId)}
                              onMouseLeave={() => setHoveredTheme(null)}
                              className="relative p-3 rounded-lg transition-all duration-200 text-left"
                              style={{
                                backgroundColor: isActive ? 'var(--t-primary-dim)' : 'var(--t-surface-hover)',
                                border: `2px solid ${isActive ? 'var(--t-primary)' : 'transparent'}`,
                                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              }}
                            >
                              {/* Theme Preview */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{getThemeIcon(themeId)}</span>
                                <span className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>
                                  {theme.name}
                                </span>
                              </div>
                              
                              {/* Color Preview Dots */}
                              <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.background }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.surface }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.sidebarBg || theme.colors.background }} />
                              </div>
                              
                              {/* Active Indicator */}
                              {isActive && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--t-success)' }} />
                              )}

                              {/* Custom Indicator */}
                              {Object.keys(customColors).length > 0 && isActive && (
                                <div className="absolute bottom-1 right-1 text-[8px] px-1 py-0.5 rounded" style={{ 
                                  backgroundColor: 'var(--t-primary)',
                                  color: 'var(--t-on-primary)'
                                }}>
                                  Custom
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* CUSTOMIZER TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                      Custom Colors
                    </h3>
                    <button
                      onClick={resetCustomColors}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: 'var(--t-surface-hover)',
                        color: 'var(--t-text-secondary)',
                      }}
                    >
                      <RotateCcw size={12} />
                      Reset All
                    </button>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                    Customize colors for the current theme ({currentThemeData.name})
                  </p>

                  {/* Color Pickers - Expanded with more options */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {[
                      { key: 'primary', label: 'Primary Color', default: themes[currentTheme]?.colors.primary || '#3b82f6' },
                      { key: 'accent', label: 'Accent Color', default: themes[currentTheme]?.colors.accent || '#8b5cf6' },
                      { key: 'background', label: 'Main Background', default: themes[currentTheme]?.colors.background || '#0f172a' },
                      { key: 'surface', label: 'Card/Surface Background', default: themes[currentTheme]?.colors.surface || '#1e293b' },
                      { key: 'sidebarBg', label: 'Sidebar Background', default: themes[currentTheme]?.colors.sidebarBg || '#0f172a' },
                      { key: 'text', label: 'Primary Text', default: themes[currentTheme]?.colors.text || '#f1f5f9' },
                      { key: 'textSecondary', label: 'Secondary Text', default: themes[currentTheme]?.colors.textSecondary || '#94a3b8' },
                      { key: 'border', label: 'Border Color', default: themes[currentTheme]?.colors.border || '#334155' },
                    ].map(({ key, label, default: defaultColor }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                          {label}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={customColors[key] || defaultColor}
                            onChange={(e) => setCustomColor(key, e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer shrink-0"
                            style={{
                              background: 'var(--t-input-bg)',
                              border: '1px solid var(--t-input-border)',
                            }}
                          />
                          <input
                            type="text"
                            value={customColors[key] || defaultColor}
                            onChange={(e) => setCustomColor(key, e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm"
                            style={{
                              background: 'var(--t-input-bg)',
                              border: '1px solid var(--t-input-border)',
                              color: 'var(--t-text)',
                            }}
                            placeholder="#HEX"
                          />
                          {customColors[key] && (
                            <button
                              onClick={() => setCustomColor(key, defaultColor)}
                              className="px-2 rounded-lg transition-colors hover:bg-[var(--t-surface-hover)] shrink-0"
                              style={{ color: 'var(--t-text-muted)' }}
                              title="Reset to default"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Preview - Enhanced */}
                  <div 
                    className="mt-4 p-4 rounded-lg space-y-3"
                    style={{
                      background: 'var(--t-surface)',
                      border: '1px solid var(--t-border)',
                    }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--t-text-muted)' }}>Live Preview</p>
                    
                    {/* Color Swatches */}
                    <div className="flex flex-wrap gap-2">
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-primary)' }} title="Primary" />
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-accent)' }} title="Accent" />
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-bg)' }} title="Background" />
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-surface)' }} title="Surface" />
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-sidebar-bg, var(--t-bg))' }} title="Sidebar" />
                      <div className="w-8 h-8 rounded" style={{ background: 'var(--t-border)' }} title="Border" />
                    </div>

                    {/* Sample Layout Preview */}
                    <div className="flex gap-2 p-2 rounded-lg" style={{ background: 'var(--t-bg)' }}>
                      {/* Sidebar preview */}
                      <div className="w-12 h-24 rounded" style={{ background: 'var(--t-sidebar-bg, var(--t-bg))' }} />
                      
                      {/* Main content preview */}
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded" style={{ background: 'var(--t-surface)' }} />
                        <div className="h-8 rounded" style={{ background: 'var(--t-surface)' }}>
                          <div className="flex gap-1 p-1">
                            <div className="w-6 h-6 rounded" style={{ background: 'var(--t-primary)' }} />
                            <div className="w-6 h-6 rounded" style={{ background: 'var(--t-accent)' }} />
                          </div>
                        </div>
                        <div className="h-3 rounded w-3/4" style={{ background: 'var(--t-surface)' }} />
                      </div>
                    </div>

                    {/* Sample Card */}
                    <div 
                      className="p-3 rounded-lg space-y-2"
                      style={{ 
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Sample Card</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>This is how your colors will look</p>
                      <div className="flex gap-2 pt-2">
                        <button 
                          className="px-3 py-1 rounded text-xs"
                          style={{ 
                            background: 'var(--t-primary)',
                            color: 'var(--t-on-primary)'
                          }}
                        >
                          Primary
                        </button>
                        <button 
                          className="px-3 py-1 rounded text-xs"
                          style={{ 
                            background: 'var(--t-surface-hover)',
                            color: 'var(--t-text)',
                            border: '1px solid var(--t-border)'
                          }}
                        >
                          Secondary
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info Text */}
                  <p className="text-xs text-center" style={{ color: 'var(--t-text-muted)' }}>
                    Custom colors are saved automatically and will persist across sessions
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}