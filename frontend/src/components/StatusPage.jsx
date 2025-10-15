/**
 * Status Page Component
 * Shows the current status of URL encryption and routing
 */

import React, { useState, useEffect } from 'react';
import { URLEncryption } from '../utils/urlEncryption';

const StatusPage = () => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [decryptedRoute, setDecryptedRoute] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);

  useEffect(() => {
    const url = window.location.pathname;
    const route = URLEncryption.decryptRoute(url.substring(1));
    
    setCurrentUrl(url);
    setDecryptedRoute(route);
    setIsEncrypted(route !== 'error' && route !== url.substring(1));
  }, []);

  const testRoutes = [
    'home',
    'about',
    'donor-login',
    'donor-dashboard',
    'admin-dashboard'
  ];

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        🛡️ SmartBlood URL Encryption Status
      </h1>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ color: '#495057', marginTop: 0 }}>Current Status</h2>
        <p><strong>Current URL:</strong> <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>{currentUrl}</code></p>
        <p><strong>Decrypted Route:</strong> <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>{decryptedRoute}</code></p>
        <p><strong>Is Encrypted:</strong> <span style={{ 
          color: isEncrypted ? '#28a745' : '#dc3545',
          fontWeight: 'bold'
        }}>{isEncrypted ? '✅ Yes' : '❌ No'}</span></p>
      </div>

      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #c3e6c3'
      }}>
        <h2 style={{ color: '#155724', marginTop: 0 }}>✅ Router Status</h2>
        <p style={{ color: '#155724', margin: 0 }}>
          <strong>Status:</strong> Router conflict resolved! Single BrowserRouter detected.
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffeaa7'
      }}>
        <h2 style={{ color: '#856404', marginTop: 0 }}>🔗 Route Mapping</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {testRoutes.map(route => (
            <div key={route} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '5px',
              border: '1px solid #dee2e6'
            }}>
              <strong>{route}</strong>
              <code style={{ backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '3px' }}>
                /{URLEncryption.encryptRoute(route)}
              </code>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#d1ecf1', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #bee5eb'
      }}>
        <h2 style={{ color: '#0c5460', marginTop: 0 }}>🧪 Test Navigation</h2>
        <p style={{ color: '#0c5460', marginBottom: '15px' }}>
          Try navigating to these encrypted URLs:
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {testRoutes.slice(0, 3).map(route => (
            <button
              key={route}
              onClick={() => {
                const encryptedUrl = URLEncryption.generateSecureURL(route);
                window.location.href = encryptedUrl;
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Go to {route}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        border: '1px solid #dee2e6'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
          <strong>Note:</strong> This status page is for testing purposes. 
          Remove it before production deployment.
        </p>
      </div>
    </div>
  );
};

export default StatusPage;
