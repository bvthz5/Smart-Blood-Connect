import React, { useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';

const BlockedUserToast = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for toast message in localStorage
    const toastMessage = localStorage.getItem('toast_message');
    if (toastMessage) {
      setMessage(toastMessage);
      setOpen(true);
      localStorage.removeItem('toast_message');
    }
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <Snackbar 
      open={open} 
      autoHideDuration={6000} 
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose} 
        severity="error" 
        elevation={6} 
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default BlockedUserToast;