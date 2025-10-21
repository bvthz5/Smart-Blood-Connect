// src/components/AuthDropdown.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AuthDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    // Use throttled mouse handler for better performance
    let ticking = false;
    const throttledHandleClickOutside = (event) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleClickOutside(event);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    document.addEventListener('mousedown', throttledHandleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', throttledHandleClickOutside);
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleMenuItemClick = () => {
    setIsOpen(false)
  }

  return (
    <div className="auth-dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="auth-dropdown__button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Register or Login options"
      >
        Register / Login
        <span className="auth-dropdown__arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div
          className="auth-dropdown__menu"
          role="menu"
          onKeyDown={handleKeyDown}
        >
          <Link
            to="/donor/login"
            className="auth-dropdown__item"
            role="menuitem"
            onClick={handleMenuItemClick}
          >
            Donor Login
          </Link>
          <Link
            to="/seeker/login"
            className="auth-dropdown__item"
            role="menuitem"
            onClick={handleMenuItemClick}
          >
            Seeker Login
          </Link>
        </div>
      )}
    </div>
  )
}
