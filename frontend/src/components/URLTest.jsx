/**
 * URL Encryption Test Component
 * For testing URL encryption functionality
 */

import React from 'react';
import { URLEncryption } from '../utils/urlEncryption';

const URLTest = () => {
  const testRoutes = [
    'home',
    'about', 
    'donor-login',
    'donor-dashboard',
    'admin-dashboard'
  ];

  const testEncryption = () => {
    console.log('=== URL Encryption Test ===');
    
    testRoutes.forEach(route => {
      const encrypted = URLEncryption.encryptRoute(route);
      const decrypted = URLEncryption.decryptRoute(encrypted);
      const requiresAuth = URLEncryption.requiresAuth(route);
      
      console.log(`Route: ${route}`);
      console.log(`Encrypted: /${encrypted}`);
      console.log(`Decrypted: ${decrypted}`);
      console.log(`Requires Auth: ${requiresAuth}`);
      console.log('---');
    });
  };

  const testNavigation = () => {
    const navigation = URLEncryption.getEncryptedNavigation();
    console.log('=== Encrypted Navigation ===');
    console.log(navigation);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>URL Encryption Test</h2>
      
      <button onClick={testEncryption} style={{ margin: '10px', padding: '10px' }}>
        Test Encryption/Decryption
      </button>
      
      <button onClick={testNavigation} style={{ margin: '10px', padding: '10px' }}>
        Test Navigation
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Current URL Info:</h3>
        <p><strong>Current Path:</strong> {window.location.pathname}</p>
        <p><strong>Decrypted Route:</strong> {URLEncryption.decryptRoute(window.location.pathname.substring(1))}</p>
        <p><strong>Requires Auth:</strong> {URLEncryption.requiresAuth(URLEncryption.decryptRoute(window.location.pathname.substring(1))) ? 'Yes' : 'No'}</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Route Mapping:</h3>
        <ul>
          {testRoutes.map(route => (
            <li key={route}>
              <strong>{route}</strong> → /{URLEncryption.encryptRoute(route)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default URLTest;
