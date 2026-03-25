import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, Menu, X, ArrowRight, Github, Twitter, 
  Linkedin, LayoutDashboard, LogOut, Settings, User, 
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export const MarketingLayout: React.FC = () => {
  const { isAuthenticated, currentUser } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem('wholescale-cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setShowCookieConsent(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const getInitials = () => {
    if (!currentUser) return '';
    if (currentUser.avatar && currentUser.avatar.length <= 2) return currentUser.avatar;
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white selection:bg-blue-500/30">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          isScrolled ? 'py-3 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/10 shadow-lg' : 'py-6 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">WholeScale OS</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                  location.pathname === link.href ? 'text-blue-400' : 'text-gray-300'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <LayoutDashboard size={18} />
                  Go to Dashboard
                </Link>
                <div className="relative">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                      {getInitials()}
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#1e293b] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-white/5 mb-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                          <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                        </div>
                        <Link 
                          to="/settings" 
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm transition-colors text-gray-300 hover:text-white"
                        >
                          <User size={18} /> Profile
                        </Link>
                        <Link 
                          to="/settings" 
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm transition-colors text-gray-300 hover:text-white"
                        >
                          <Settings size={18} /> Settings
                        </Link>
                        <Link 
                          to="/dashboard" 
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm transition-colors text-gray-300 hover:text-white"
                        >
                          <LayoutDashboard size={18} /> Dashboard
                        </Link>
                        <div className="h-px bg-white/5 my-2" />
                        <button 
                          onClick={async () => {
                            if (supabase) await supabase.auth.signOut();
                            navigate('/login');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm transition-colors text-red-400"
                        >
                          <LogOut size={18} /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link 
                  to="/login?signup=true" 
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                >
                  Get Started <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#1e293b] border-b border-white/10 p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href}
                className="block text-lg font-medium text-gray-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-white/5" />
            
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
                  </div>
                </div>
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-3 text-lg font-medium text-blue-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={20} /> Go to Dashboard
                </Link>
                <Link 
                  to="/settings" 
                  className="flex items-center gap-3 text-lg font-medium text-gray-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings size={20} /> Settings
                </Link>
                <button 
                  onClick={async () => {
                    if (supabase) await supabase.auth.signOut();
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-lg font-medium text-red-400"
                >
                  <LogOut size={20} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="block text-lg font-medium text-gray-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link 
                  to="/login?signup=true" 
                  className="block w-full py-3 rounded-xl bg-blue-600 text-center font-bold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0b1120] border-t border-white/5 py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold">WholeScale</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The all-in-one operating system for modern real estate professionals. Automate, scale, and close more deals.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Twitter size={18} /></a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Linkedin size={18} /></a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Github size={18} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-500">Platform</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/features" className="hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link to="#" className="text-gray-600 cursor-not-allowed">Integrations</Link></li>
              <li><Link to="#" className="text-gray-600 cursor-not-allowed">Roadmap</Link></li>
            </ul>
          </div>

          <div>
            <div className="space-y-4">
              <h4 className="text-white font-bold">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-500">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} WholeScale OS. All rights reserved.
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      {showCookieConsent && (
        <div className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-[400px] z-[200] p-6 rounded-[2rem] bg-[#1e293b] border border-blue-500/30 shadow-2xl animate-in slide-in-from-bottom-10 lg:slide-in-from-right-10 duration-500">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0">
                 <Settings size={24} className="animate-spin-slow" />
              </div>
              <div className="space-y-4">
                 <div>
                    <h4 className="font-bold text-white">Sovereign Data Controls</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                       We use high-performance cookies to ensure the integrity of your session and provide the best OS experience.
                    </p>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        localStorage.setItem('wholescale-cookie-consent', 'true');
                        setShowCookieConsent(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Accept Protocol
                    </button>
                    <Link to="/privacy" className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Learn More</Link>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};
