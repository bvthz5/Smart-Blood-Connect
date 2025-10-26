import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import tokenStorage from '../../utils/tokenStorage';
import { redirectToLogin } from '../../utils/authRedirect';
import { 
  User, Droplet, Hash, AlertCircle, Phone, 
  Calendar, FileText, Upload, CheckCircle, 
  XCircle, Loader, Save
} from 'lucide-react';
import './CreateRequest.css';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    patientName: '', 
    bloodGroup: '', 
    unitsRequired: '', 
    urgency: '', 
    contactPerson: '', 
    contactPhone: '', 
    description: '', 
    requiredBy: '',
    attachedFile: null
  });
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formProgress, setFormProgress] = useState(0);

  // Calculate form completion progress
  useEffect(() => {
    const totalFields = 7; // Required fields count
    let filledFields = 0;
    
    if (form.patientName.trim()) filledFields++;
    if (form.bloodGroup) filledFields++;
    if (form.unitsRequired) filledFields++;
    if (form.urgency) filledFields++;
    if (form.contactPerson.trim()) filledFields++;
    if (form.contactPhone.trim()) filledFields++;
    if (form.requiredBy) filledFields++;
    
    setFormProgress((filledFields / totalFields) * 100);
  }, [form]);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const urgencyLevels = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FFC107' },
    { value: 'high', label: 'High', color: '#F44336' }
  ];

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.patientName.trim()) errors.patientName = 'Patient name is required';
    if (!form.bloodGroup) errors.bloodGroup = 'Please select a blood group';
    if (!form.unitsRequired || form.unitsRequired < 1) errors.unitsRequired = 'Units must be at least 1';
    if (!form.urgency) errors.urgency = 'Please select urgency level';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!form.contactPhone.trim()) {
      errors.contactPhone = 'Contact phone is required';
    } else if (!validatePhone(form.contactPhone)) {
      errors.contactPhone = 'Invalid phone number format';
    }
    if (!form.requiredBy) errors.requiredBy = 'Required date/time is needed';
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setForm({ ...form, attachedFile: file });
      setFileName(file.name);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);
    
    try {
      // Map form to backend expected format
      const requestData = {
        patient_ref: form.patientName,
        blood_group: form.bloodGroup,
        units: parseInt(form.unitsRequired),
        urgency: form.urgency.toUpperCase(),
        needed_by: form.requiredBy,
        contact_person: form.contactPerson,
        contact_phone: form.contactPhone,
        description: form.description || '',
        ward: form.contactPerson // Using contact person as ward for now
      };

      // If file attached, handle file upload here
      // For now, we'll store the request without file
      
      await seekerService.createRequest(requestData);
      
      setSuccess(true);
      setError('');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setForm({ 
          patientName: '', 
          bloodGroup: '', 
          unitsRequired: '', 
          urgency: '', 
          contactPerson: '', 
          contactPhone: '', 
          description: '', 
          requiredBy: '',
          attachedFile: null
        });
        setFileName('');
        setSuccess(false);
        navigate('/seeker/requests');
      }, 2000);
      
    } catch (err) {
      console.error('Request creation error:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    tokenStorage.clearTokens();
    redirectToLogin();
  };

  const handleCancel = () => {
    navigate('/seeker/requests');
  };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="create-request-container">
        {/* Header */}
        <div className="request-header">
          <div className="header-content">
            <Droplet className="header-icon" />
            <div>
              <h1 className="header-title">Create Blood Request</h1>
              <p className="header-subtitle">Fill in the details to raise a new blood request</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <span>Request created successfully! Redirecting...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Progress */}
        <div className="form-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#666' }}>Form Completion</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#FF5252' }}>{Math.round(formProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${formProgress}%` }}></div>
          </div>
        </div>

        {/* Form */}
        <form className="request-form" onSubmit={submit}>
          {/* Patient Information Section */}
          <div className="form-section">
            <div className="section-header">
              <User size={20} />
              <h3>Patient Information</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Patient Name <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    name="patientName"
                    value={form.patientName}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.patientName ? 'error' : ''}`}
                    placeholder="Enter patient's full name"
                  />
                </div>
                {fieldErrors.patientName && (
                  <span className="error-message">{fieldErrors.patientName}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Blood Group <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Droplet className="input-icon" size={18} />
                  <select
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.bloodGroup ? 'error' : ''}`}
                  >
                    <option value="">Select blood group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                {fieldErrors.bloodGroup && (
                  <span className="error-message">{fieldErrors.bloodGroup}</span>
                )}
              </div>
            </div>
          </div>

          {/* Request Details Section */}
          <div className="form-section">
            <div className="section-header">
              <AlertCircle size={20} />
              <h3>Request Details</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Units Required <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Hash className="input-icon" size={18} />
                  <input
                    type="number"
                    name="unitsRequired"
                    min="1"
                    max="20"
                    value={form.unitsRequired}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.unitsRequired ? 'error' : ''}`}
                    placeholder="Number of units"
                  />
                </div>
                {fieldErrors.unitsRequired && (
                  <span className="error-message">{fieldErrors.unitsRequired}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Urgency Level <span className="required">*</span>
                </label>
                <div className="urgency-selector">
                  {urgencyLevels.map(level => (
                    <label key={level.value} className="urgency-option">
                      <input
                        type="radio"
                        name="urgency"
                        value={level.value}
                        checked={form.urgency === level.value}
                        onChange={onChange}
                        aria-label={`Urgency level: ${level.label}`}
                      />
                      <span 
                        className="urgency-badge"
                        style={{ 
                          borderColor: level.color,
                          color: level.value === 'low' ? '#2E7D32' : 
                                 level.value === 'medium' ? '#FF8F00' : '#C62828'
                        }}
                      >
                        {level.label}
                      </span>
                    </label>
                  ))}
                </div>
                {fieldErrors.urgency && (
                  <span className="error-message" role="alert">{fieldErrors.urgency}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  Required By <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Calendar className="input-icon" size={18} />
                  <input
                    type="datetime-local"
                    name="requiredBy"
                    value={form.requiredBy}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.requiredBy ? 'error' : ''}`}
                  />
                </div>
                {fieldErrors.requiredBy && (
                  <span className="error-message">{fieldErrors.requiredBy}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <div className="section-header">
              <Phone size={20} />
              <h3>Contact Information</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Contact Person <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    name="contactPerson"
                    value={form.contactPerson}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.contactPerson ? 'error' : ''}`}
                    placeholder="Hospital representative name"
                  />
                </div>
                {fieldErrors.contactPerson && (
                  <span className="error-message">{fieldErrors.contactPerson}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Contact Phone <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Phone className="input-icon" size={18} />
                  <input
                    type="tel"
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={onChange}
                    className={`form-input ${fieldErrors.contactPhone ? 'error' : ''}`}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                {fieldErrors.contactPhone && (
                  <span className="error-message">{fieldErrors.contactPhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="form-section">
            <div className="section-header">
              <FileText size={20} />
              <h3>Additional Information</h3>
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                className="form-textarea"
                placeholder="Additional notes, diagnosis, or special needs..."
                rows="4"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                Attach File (Optional)
              </label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={onFileChange}
                  className="file-input"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  <Upload size={20} />
                  <span>{fileName || 'Upload prescription or doctor note'}</span>
                  <span className="file-hint">PDF, JPG, PNG, DOC (Max 5MB)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              <XCircle size={18} />
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spin" size={18} />
                  Submitting...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </SeekerLayout>
  );
};

export default CreateRequest;
