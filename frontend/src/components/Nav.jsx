// src/components/Nav.jsx
import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import AuthDropdown from './AuthDropdown'
import { throttle } from '../utils/performance'
import '../styles/nav.css'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState('en')
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false)
  const [navDropdownOpen, setNavDropdownOpen] = useState(false)
  const headerRef = useRef(null)
  const location = useLocation()

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en'
    setLanguage(savedLanguage)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.header__dropdown')) {
        setLoginDropdownOpen(false)
        setNavDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return
      if (window.scrollY > 8) headerRef.current.classList.add('scrolled')
      else headerRef.current.classList.remove('scrolled')
    }
    onScroll()
    // Use throttled scroll handler for better performance
    const throttledOnScroll = throttle(onScroll, 16); // 60fps throttling
    
    window.addEventListener('scroll', throttledOnScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledOnScroll);
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ml' : 'en'
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLanguage }))
  }


  // Hide navbar completely on register/login pages
  if (location.pathname === '/register' || location.pathname === '/login') {
    return (
      <div className="auth-page-header">
        <div className="container">
          <div className="auth-header-content">
            <div className="auth-logo">
              <img src="/logo.png" alt="Smart Blood logo" />
              <span>Smart Blood</span>
            </div>
            <AuthDropdown />
          </div>
        </div>
      </div>
    )
  }

  // Home page - fixed navbar with minimal items
  if (location.pathname === '/') {
    return (
      <header className="header header--fixed" role="banner" ref={headerRef} style={{ zIndex: 999 }}>
        <div className="container header__inner">
          <div className="header__brand">
            <NavLink to="/" className="header__logo-link" aria-label="Smart Blood home">
              <div className="header__logo-wrap" aria-hidden>
                <img src="/logo.png" alt="Smart Blood logo" />
              </div>
              <div className="header__titles">
                <div className="site-title">Smart Blood</div>
                <div className="site-sub">Connect &amp; Save Lives</div>
              </div>
            </NavLink>
          </div>

          <nav className="header__nav" role="navigation" aria-label="Main navigation">
            <div className={`header__dropdown ${navDropdownOpen ? 'open' : ''}`}>
              <button 
                className="header__link header__link--button" 
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
              >
                More
                <span className="header__dropdown-arrow">▼</span>
              </button>
              <div className="header__dropdown-menu">
                <NavLink 
                  to="/about" 
                  className="header__dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  About
                </NavLink>
                <NavLink 
                  to="/faq" 
                  className="header__dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  FAQ
                </NavLink>
                <NavLink 
                  to="/policies" 
                  className="header__dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Policies
                </NavLink>
                <NavLink 
                  to="/contact" 
                  className="header__dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Contact
                </NavLink>
              </div>
            </div>
          </nav>

          <div className="header__actions">
            <div className="header__controls">
              <button 
                className="header__toggle-btn header__toggle-btn--dark-mode" 
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button 
                className="header__toggle-btn header__toggle-btn--language" 
                onClick={toggleLanguage}
                aria-label="Toggle language"
              >
                {language === 'en' ? 'English' : 'മലയാളം'}
              </button>
            </div>
            <div className={`header__dropdown ${loginDropdownOpen ? 'open' : ''}`}>
              <button 
                className="btn header__cta" 
                onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                aria-label="Login Options"
              >
                {language === 'en' ? 'Login' : 'ലോഗിൻ'}
                <span className="header__dropdown-arrow">▼</span>
              </button>
              <div className="header__dropdown-menu">
                <NavLink 
                  to="/seeker/login" 
                  className="header__dropdown-item"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  Donor Login
                </NavLink>
                <NavLink 
                  to="/seeker/login" 
                  className="header__dropdown-item"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  {language === 'en' ? 'Seeker Login' : 'അന്വേഷകൻ ലോഗിൻ'}
                </NavLink>
                <NavLink 
                  to="/admin/login" 
                  className="header__dropdown-item"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  {language === 'en' ? 'Admin Login' : 'അഡ്മിൻ ലോഗിൻ'}
                </NavLink>
              </div>
            </div>

            <button
              className="header__mobile-toggle"
              aria-expanded={open}
              aria-label="Toggle menu"
              onClick={() => setOpen(v => !v)}
            >
              <span className="visually-hidden">Toggle navigation</span>
              <span aria-hidden>{open ? '\u2715' : '\u2630'}</span>
            </button>
          </div>
        </div>

        {open && (
          <div className="header__mobile" role="menu">
            <NavLink className="header__link" to="/about" onClick={() => setOpen(false)}>About</NavLink>
            <NavLink className="header__link" to="/faq" onClick={() => setOpen(false)}>FAQ</NavLink>
            <NavLink className="header__link" to="/policies" onClick={() => setOpen(false)}>Policies</NavLink>
            <NavLink className="header__link" to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
            <NavLink className="header__link" to="/seeker/request" onClick={() => setOpen(false)}>Find Blood</NavLink>
            <NavLink className="btn btn--outline" to="/seeker/login" onClick={() => setOpen(false)}>Seeker Login</NavLink>
          </div>
        )}
      </header>
    )
  }

  // Other pages - normal navbar without removed items
  return (
    <header className="header" role="banner" ref={headerRef}>
      <div className="container header__inner">
        <div className="header__brand">
          <NavLink to="/" className="header__logo-link" aria-label="Smart Blood home">
            <div className="header__logo-wrap" aria-hidden>
              <img src="/logo.png" alt="Smart Blood logo" />
            </div>
            <div className="header__titles">
              <div className="site-title">Smart Blood</div>
              <div className="site-sub">Connect &amp; Save Lives</div>
            </div>
          </NavLink>
        </div>

        <nav className="header__nav" role="navigation" aria-label="Main navigation">
          <div className={`header__dropdown ${navDropdownOpen ? 'open' : ''}`}>
            <button 
              className="header__link header__link--button" 
              onClick={() => setNavDropdownOpen(!navDropdownOpen)}
            >
              More
              <span className="header__dropdown-arrow">▼</span>
            </button>
            <div className="header__dropdown-menu">
                <NavLink 
                  to="/about" 
                  className="header__dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  About
                </NavLink>
              <NavLink 
                to="/faq" 
                className="header__dropdown-item"
                onClick={() => setNavDropdownOpen(false)}
              >
                FAQ
              </NavLink>
              <NavLink 
                to="/policies" 
                className="header__dropdown-item"
                onClick={() => setNavDropdownOpen(false)}
              >
                Policies
              </NavLink>
              <NavLink 
                to="/contact" 
                className="header__dropdown-item"
                onClick={() => setNavDropdownOpen(false)}
              >
                Contact
              </NavLink>
            </div>
          </div>
          <NavLink className="header__link" to="/seeker/request">Find Blood</NavLink>
        </nav>

        <div className="header__actions">
          <div className="header__controls">
            <button 
              className="header__toggle-btn header__toggle-btn--dark-mode" 
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {darkMode ? 'Sun' : 'Moon'}
            </button>
            <button 
              className="header__toggle-btn header__toggle-btn--language" 
              onClick={toggleLanguage}
              aria-label="Toggle language"
            >
              {language === 'en' ? 'English' : 'മലയാളം'}
            </button>
          </div>
          <div className={`header__dropdown ${loginDropdownOpen ? 'open' : ''}`}>
            <button 
              className="btn header__cta" 
              onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
              aria-label="Login Options"
            >
              {language === 'en' ? 'Login' : 'ലോഗിൻ'}
              <span className="header__dropdown-arrow">▼</span>
            </button>
            <div className="header__dropdown-menu">
              <NavLink 
                to="/seeker/login" 
                className="header__dropdown-item"
                onClick={() => setLoginDropdownOpen(false)}
              >
                Donor Login
              </NavLink>
              <NavLink 
                to="/seeker/login" 
                className="header__dropdown-item"
                onClick={() => setLoginDropdownOpen(false)}
              >
                {language === 'en' ? 'Seeker Login' : 'അന്വേഷകൻ ലോഗിൻ'}
              </NavLink>
              <NavLink 
                to="/admin/login" 
                className="header__dropdown-item"
                onClick={() => setLoginDropdownOpen(false)}
              >
                {language === 'en' ? 'Admin Login' : 'അഡ്മിൻ ലോഗിൻ'}
              </NavLink>
            </div>
          </div>

          <button
            className="header__mobile-toggle"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen(v => !v)}
          >
            <span className="visually-hidden">Toggle navigation</span>
            <span aria-hidden>{open ? '\u2715' : '\u2630'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="header__mobile" role="menu">
          <NavLink className="header__link" to="/about-us" onClick={() => setOpen(false)}>About</NavLink>
          <NavLink className="header__link" to="/faq" onClick={() => setOpen(false)}>FAQ</NavLink>
          <NavLink className="header__link" to="/policies" onClick={() => setOpen(false)}>Policies</NavLink>
          <NavLink className="header__link" to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
          <NavLink className="header__link" to="/seeker/request" onClick={() => setOpen(false)}>Find Blood</NavLink>
          <NavLink className="btn btn--outline" to="/seeker/login" onClick={() => setOpen(false)}>Seeker Login</NavLink>
        </div>
      )}
    </header>
  )
}
