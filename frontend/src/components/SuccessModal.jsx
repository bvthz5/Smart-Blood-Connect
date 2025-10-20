import React, { memo } from 'react';
import { X } from 'lucide-react';
import './SuccessModal.css';

const SuccessModal = memo(({ isOpen, onClose, title, message, details, type = 'success' }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '✅';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#10b981';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        
        <div className="modal-icon" style={{ color: getIconColor() }}>
          {getIcon()}
        </div>
        
        <h2 className="modal-title">{title}</h2>
        
        <p className="modal-message">{message}</p>
        
        {details && (
          <div className="modal-details">
            {details}
          </div>
        )}
        
        <button className="modal-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
});

SuccessModal.displayName = 'SuccessModal';

export default SuccessModal;
