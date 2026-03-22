import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, isAdmin, isSuperAdmin, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/rankings') return location.pathname === '/rankings';
    return location.pathname.startsWith(path);
  };

  const linkClass = (path) =>
    `block px-3 py-2 rounded text-sm font-semibold transition-all border ${
      isActive(path)
        ? 'bg-gold text-dark border-gold'
        : 'text-light-gold border-gold/40 hover:bg-gold hover:text-dark hover:border-gold'
    }`;

  const navLinks = [
    { path: '/rankings', label: 'Rankings', auth: true },
    { path: '/classifications', label: 'Classifications', auth: true },
    { path: '/tournaments', label: 'Tournaments', auth: true },
    { path: '/rules', label: 'Rules', auth: true },
    { path: '/events', label: 'Events', auth: true },
    { path: '/documents', label: 'Documents', auth: true },
    { path: '/my-page', label: 'My Page', auth: true },
    { path: '/admin', label: 'Admin', admin: true },
  ];

  const visibleLinks = navLinks.filter((link) => {
    if (link.admin) return isAdmin;
    if (link.auth) return isAuthenticated;
    return false;
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-gold shadow-lg"
         style={{ background: 'linear-gradient(135deg, #0f4225 0%, #1a6b3a 60%, #0f4225 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo + Title */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/owba_logo.jpg"
              alt="OWBA Logo"
              className="w-[52px] h-[52px] object-contain rounded-lg shadow-[0_0_16px_rgba(201,168,76,0.4)] shrink-0"
            />
            <div className="hidden sm:block">
              <div className="text-xl font-extrabold text-light-gold tracking-wider uppercase leading-tight">
                OWBA
              </div>
              <div className="text-[0.7rem] text-white/70 leading-tight">
                Orange Walk Billiards Association
              </div>
            </div>
            <span className="sm:hidden text-xl font-extrabold text-light-gold tracking-wider uppercase">
              OWBA
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            {visibleLinks.map((link) => (
              <Link key={link.path} to={link.path} className={linkClass(link.path)}>
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="ml-1 px-3 py-2 text-sm font-semibold text-light-gold/70 border border-gold/20 hover:border-gold/40 hover:text-light-gold rounded transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-1 px-4 py-2 text-sm font-bold bg-gold text-dark hover:bg-light-gold rounded transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded border border-gold text-light-gold hover:bg-gold/20 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-gold/30 transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
        style={{ background: 'linear-gradient(180deg, #0f4225, #0d0d0d)' }}
      >
        <div className="px-4 py-3 space-y-2">
          {isAuthenticated && (
            <div className="px-3 py-2 text-xs text-gold/60 uppercase tracking-wider">
              {user?.name} {isSuperAdmin ? '(Super Admin)' : isAdmin ? '(Admin)' : ''}
            </div>
          )}
          {visibleLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={linkClass(link.path)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm font-semibold text-light-gold/70 border border-gold/20 hover:bg-gold/20 rounded transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold bg-gold text-dark hover:bg-light-gold rounded transition-colors text-center"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
