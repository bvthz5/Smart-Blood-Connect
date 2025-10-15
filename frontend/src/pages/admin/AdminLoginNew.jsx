import React from 'react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import AdminLogin from '../../components/admin/AdminLogin';

const AdminLoginNew = () => {
  return (
    <ThemeProvider>
      <AdminLogin />
    </ThemeProvider>
  );
};

export default AdminLoginNew;
