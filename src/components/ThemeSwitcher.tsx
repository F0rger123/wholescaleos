import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';
import { Palette, Sparkles, RotateCcw, X } from 'lucide-react';

export function ThemeSwitcher() {
  const { currentTheme, setTheme, customColors, setCustomColor, resetCustomColors } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customizer'>('presets');
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentThemeData = themes[currentTheme] || themes.dark;

  const themeCategories = {
    'Default': ['dark', 'light'],
    'Premium': ['glass', 'oled', 'midnight', 'black-marble', 'white-marble'],
    'Neon & Creative': ['neon', 'moon', 'aurora', 'cyberpunk'],
    'Luxury': ['platinum', 'rose-gold', 'charcoal'],
    'Minimalist': ['slate', 'ivory', 'winter-frost'],
  };

  const getThemeIcon = (themeId: string) => {
    const icons: Record<string, string> = {
      'dark': '🌙', 'light': '☀️', 'glass': '✨', 'oled': '⬛',
      'midnight': '🌃', 'black-marble': '⚫', 'white-marble': '⚪',
      'neon': '💚', 'moon': '🌕', 'platinum': '💎', 'rose-gold': '✨',
      'charcoal': '⚙️', 'aurora': '✨', 'cyberpunk': '🌃', 'slate': '📱',
      'ivory': '🤍', 'winter-frost': '❄️',
    };
    return icons[themeId] || '🎨';
  };

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Theme Switcher Button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: 'var(--t-surface)',
          color: 'var(--t-text)',
          border: '1px solid var(--t-border)',
          position: 'relative',
          zIndex: isOpen ? 2147483647 : 1,
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

      {/* Portal Dropdown */}
      {isOpen && buttonRect && (
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 2147483647,
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme Picker */}
          <div 
            style={{
              position: 'fixed',
              top: buttonRect.bottom + 8,
              right: window.innerWidth - buttonRect.right,
              width: '384px',
              maxHeight: '80vh',
              overflow: 'hidden',
              borderRadius: '1rem',
              border: '1px solid var(--t-border)',
              backgroundColor: 'var(--t-surface)',
              boxShadow: 'var(--t-glow-shadow)',
              zIndex: 2147483647,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
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

                    {/* Color Pickers */}
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

                    {/* Live Preview */}
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
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-primary)' }} />
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-accent)' }} />
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-bg)' }} />
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-surface)' }} />
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-sidebar-bg, var(--t-bg))' }} />
                        <div className="w-8 h-8 rounded" style={{ background: 'var(--t-border)' }} />
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
          </div>
        </>
      )}
    </>
  );
}