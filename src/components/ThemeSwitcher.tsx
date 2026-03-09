import { useState } from 'react';  // Changed from 'React'
import { useStore } from '../store/useStore';
import { themes } from '../styles/themes';  // Removed 'Theme' since it's not used

export function ThemeSwitcher() {
  const { currentTheme, setTheme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
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
            className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl z-50 border"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              boxShadow: 'var(--t-glow-shadow)',
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>
                  Theme Gallery
                </h3>
                <span className="text-sm px-2 py-1 rounded" style={{ 
                  backgroundColor: 'var(--t-primary-dim)',
                  color: 'var(--t-primary-text)'
                }}>
                  {Object.keys(themes).length} themes
                </span>
              </div>
              
              {/* Categories */}
              {Object.entries(themeCategories).map(([category, themeIds]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--t-text-muted)' }}>
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
                          className="relative p-3 rounded-lg transition-all duration-200"
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
                          </div>
                          
                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--t-success)' }} />
                          )}
                          
                          {/* Hover Preview Tooltip */}
                          {isHovered && !isActive && (
                            <div 
                              className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap z-50"
                              style={{
                                backgroundColor: 'var(--t-surface)',
                                color: 'var(--t-text)',
                                border: '1px solid var(--t-border)',
                                boxShadow: 'var(--t-glow-shadow)',
                              }}
                            >
                              {theme.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Custom Theme Button (for future color picker) */}
              <button
                className="w-full mt-4 p-3 rounded-lg flex items-center justify-center gap-2 border border-dashed transition-all duration-200 hover:scale-102"
                style={{
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text-secondary)',
                  backgroundColor: 'var(--t-surface-hover)',
                }}
                onClick={() => {
                  // TODO: Open color customizer
                  alert('🎨 Color customizer coming soon! You\'ll be able to create your own themes.');
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Custom Theme</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}