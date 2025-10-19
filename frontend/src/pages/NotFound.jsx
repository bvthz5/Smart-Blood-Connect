import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart } from 'lucide-react';
import { tokenManager } from '../utils/tokenManager';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminContext, setIsAdminContext] = useState(false);

  // Check if user came from an admin route
  useEffect(() => {
    const referrer = document.referrer;
    const previousPath = location.state?.from?.pathname || '';
    const isFromAdmin = previousPath.includes('/admin') || referrer.includes('/admin');
    setIsAdminContext(isFromAdmin);
  }, [location]);

  // Handle "Return Home" click for admin users
  const handleReturnHome = (e) => {
    if (isAdminContext) {
      e.preventDefault();
      
      // Check if admin token is valid
      const isValidAdmin = tokenManager.isAdminAuthenticated();
      
      if (isValidAdmin) {
        // Token is valid, redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        // Token is invalid or expired, redirect to admin login
        navigate('/admin/login');
      }
    }
    // For non-admin users, the Link component will handle navigation to '/'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      color: '#e0e0e0',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 80%, rgba(183, 28, 28, 0.15) 0%, transparent 50%)',
        zIndex: 0
      }}></div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '600px' }}>
        {/* 404 Number */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          fontSize: '8rem',
          fontWeight: '900',
          lineHeight: 1
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #B71C1C 0%, #FF6B6B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>4</span>
          
          <div style={{
            width: '120px',
            height: '120px',
            border: '4px solid #FF6B6B',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 25px rgba(183, 28, 28, 0.6)'
          }}>
            <Heart size={40} color="#FF6B6B" />
          </div>
          
          <span style={{
            background: 'linear-gradient(135deg, #B71C1C 0%, #FF6B6B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>4</span>
        </div>

        {/* Error Message */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #B71C1C 0%, #FF6B6B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Page Not Found
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: '#e0e0e0',
            lineHeight: 1.6,
            opacity: 0.9
          }}>
            The page you're looking for seems to have wandered off into the digital void. 
            Don't worry, we'll help you find your way back to saving lives.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <Link 
            to="/" 
            onClick={handleReturnHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #B71C1C 0%, #FF6B6B 100%)',
              color: 'white',
              boxShadow: '0 10px 25px rgba(183, 28, 28, 0.4)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}>
            <Home size={20} />
            {isAdminContext ? 'Return to Admin' : 'Return Home'}
          </Link>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/seeker/request" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e0e0e0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease'
            }}>
              <Search size={20} />
              Find Blood
            </Link>
            
            <Link to="/donor/register" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e0e0e0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease'
            }}>
              <Heart size={20} />
              Donate Blood
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#999999', marginBottom: '1rem', fontSize: '1rem' }}>
            Quick Links:
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <Link to="/about" style={{
              color: '#e0e0e0',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}>About Us</Link>
            <Link to="/faq" style={{
              color: '#e0e0e0',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}>FAQ</Link>
            <Link to="/contact" style={{
              color: '#e0e0e0',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}>Contact</Link>
            <Link to="/policies" style={{
              color: '#e0e0e0',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}>Policies</Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: '#999999',
        fontSize: '0.9rem'
      }}>
        <p>SmartBlood — Connecting lives, saving futures</p>
      </footer>
    </div>
  );
};

export default NotFound;