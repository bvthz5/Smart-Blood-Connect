import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import tokenStorage from '../../utils/tokenStorage';
import { redirectToLogin } from '../../utils/authRedirect';
import { 
  User, Droplet, Hash, AlertCircle, Phone, 
  Calendar, FileText, CheckCircle, 
  XCircle, Loader, Send, ArrowLeft, Activity
} from 'lucide-react';
import './CreateRequest.css';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    patient_name: '', 
    blood_group: '', 
    units_required: '', 
    urgency: '', 
    contact_person: '', 
    contact_phone: '', 
    description: '', 
    required_by: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formProgress, setFormProgress] = useState(0);

  // Calculate form completion progress
  useEffect(() => {
    const totalFields = 7; // Required fields count
    let filledFields = 0;
    
    if (form.patient_name?.trim()) filledFields++;
    if (form.blood_group) filledFields++;
    if (form.units_required && parseInt(form.units_required) > 0) filledFields++;
    if (form.urgency) filledFields++;
    if (form.contact_person?.trim()) filledFields++;
    if (form.contact_phone?.trim()) filledFields++;
    if (form.required_by) filledFields++;
    
    setFormProgress((filledFields / totalFields) * 100);
  }, [form]);

  const urgencyLevels = [
    { value: 'critical', label: 'Critical', color: '#C62828', bg: '#FFEBEE' },
    { value: 'high', label: 'High', color: '#F44336', bg: '#FFCDD2' },
    { value: 'medium', label: 'Medium', color: '#FF8F00', bg: '#FFF3E0' },
    { value: 'low', label: 'Low', color: '#2E7D32', bg: '#E8F5E9' }
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  // Validate phone number (international format supported)
  const validatePhone = (phone) => {
    // Accepts formats: +91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  };

  // Validate future date
  const validateFutureDate = (dateString) => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const now = new Date();
    return selectedDate > now;
  };

  // Validate patient name (max 255 chars, non-empty)
  const validatePatientName = (name) => {
    return name && name.trim().length > 0 && name.trim().length <= 255;
  };

  // Validate units (1-20)
  const validateUnits = (units) => {
    const num = parseInt(units);
    return !isNaN(num) && num >= 1 && num <= 20;
  };

  const validateForm = () => {
    const errors = {};
    
    // Patient Name - required, non-empty, max 255 chars
    if (!form.patient_name?.trim()) {
      errors.patient_name = 'Patient name is required';
    } else if (form.patient_name.trim().length > 255) {
      errors.patient_name = 'Patient name must not exceed 255 characters';
    }
    
    // Blood Group - required
    if (!form.blood_group) {
      errors.blood_group = 'Please select a blood group';
    }
    
    // Units Required - required, integer, > 0, <= 20
    if (!form.units_required) {
      errors.units_required = 'Units required is mandatory';
    } else if (!validateUnits(form.units_required)) {
      errors.units_required = 'Units must be between 1 and 20';
    }
    
    // Required By - required, must be in future
    if (!form.required_by) {
      errors.required_by = 'Required date/time is mandatory';
    } else if (!validateFutureDate(form.required_by)) {
      errors.required_by = 'Date must be in the future';
    }
    
    // Urgency - required
    if (!form.urgency) {
      errors.urgency = 'Please select urgency level';
    }
    
    // Contact Person - required
    if (!form.contact_person?.trim()) {
      errors.contact_person = 'Contact person is required';
    } else if (form.contact_person.trim().length > 255) {
      errors.contact_person = 'Contact person name must not exceed 255 characters';
    }
    
    // Contact Phone - required, validated pattern
    if (!form.contact_phone?.trim()) {
      errors.contact_phone = 'Contact phone is required';
    } else if (!validatePhone(form.contact_phone)) {
      errors.contact_phone = 'Invalid phone number (use format: +91XXXXXXXXXX or 10-15 digits)';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear general error
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    // Validate form
    if (!validateForm()) {
      setError('Please fix all validation errors before submitting');
      // Scroll to first error
      const firstErrorField = document.querySelector('.form-input.error, .form-textarea.error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    setLoading(true);
    
    try {
      // Prepare request data matching backend API specification
      const requestData = {
        patient_name: form.patient_name.trim(),
        blood_group: form.blood_group,
        units_required: parseInt(form.units_required),
        urgency: form.urgency,
        required_by: form.required_by,
        contact_person: form.contact_person.trim(),
        contact_phone: form.contact_phone.trim(),
        description: form.description?.trim() || ''
      };

      const response = await seekerService.createRequest(requestData);
      
      // Get request ID from response
      const requestId = response.request_id || response.id;
      
      if (requestId) {
        setSuccess(true);
        setError('');
        
        // Navigate to dedicated search results page
        navigate(`/seeker/donor-search/${requestId}`, {
          state: {
            requestData: response,
            timestamp: Date.now()
          }
        });
      } else {
        throw new Error('No request ID returned');
      }
      
    } catch (err) {
      console.error('Request creation error:', err);
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          'Failed to create request. Please try again.';
      setError(errorMessage);
      
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        {/* Stunning Header */}
        <div className="request-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <Droplet className="header-icon" />
              <div className="icon-pulse"></div>
            </div>
            <div className="header-text">
              <h1 className="header-title">Create Blood Request</h1>
              <p className="header-subtitle">Submit a new blood requirement with detailed information</p>
            </div>
          </div>
          <div className="header-decoration"></div>
        </div>

        {/* Alert Messages */}
        {success && (
          <div className="alert alert-success" role="alert">
            <CheckCircle size={22} />
            <div>
              <strong>Success!</strong>
              <p>Blood request created successfully. Redirecting to requests list...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={22} />
            <div>
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Form Progress Indicator */}
        <div className="form-progress-card">
          <div className="progress-header">
            <Activity size={18} />
            <span className="progress-label">Form Completion</span>
            <span className="progress-percentage">{Math.round(formProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${formProgress}%` }}>
              <div className="progress-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Professional Form */}
        <form className="request-form" onSubmit={submit} noValidate>
          {/* Patient Information Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <User size={20} />
              </div>
              <div>
                <h3 className="section-title">Patient Information</h3>
                <p className="section-subtitle">Details about the patient requiring blood</p>
              </div>
            </div>
            
            <div className="form-grid">
              {/* Patient Name */}
              <div className="form-group">
                <label htmlFor="patient_name" className="form-label">
                  Patient Name <span className="required" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="patient_name"
                  name="patient_name"
                  value={form.patient_name}
                  onChange={onChange}
                  className={`form-input ${fieldErrors.patient_name ? 'error' : ''}`}
                  placeholder="Enter patient's full name"
                  maxLength={255}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.patient_name}
                  aria-describedby={fieldErrors.patient_name ? "patient_name_error" : undefined}
                />
                {fieldErrors.patient_name && (
                  <span id="patient_name_error" className="error-message" role="alert">
                    {fieldErrors.patient_name}
                  </span>
                )}
              </div>

              {/* Blood Group */}
              <div className="form-group">
                <label htmlFor="blood_group" className="form-label">
                  Blood Group <span className="required" aria-label="required">*</span>
                </label>
                <select
                  id="blood_group"
                  name="blood_group"
                  value={form.blood_group}
                  onChange={onChange}
                  className={`form-input form-select ${fieldErrors.blood_group ? 'error' : ''}`}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.blood_group}
                  aria-describedby={fieldErrors.blood_group ? "blood_group_error" : undefined}
                >
                  <option value="">Select blood group</option>
                  {bloodGroups.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                {fieldErrors.blood_group && (
                  <span id="blood_group_error" className="error-message" role="alert">
                    {fieldErrors.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Request Details Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="section-title">Request Details</h3>
                <p className="section-subtitle">Quantity, urgency, and timeline information</p>
              </div>
            </div>
            
            <div className="form-grid">
              {/* Units Required */}
              <div className="form-group">
                <label htmlFor="units_required" className="form-label">
                  Units Required <span className="required" aria-label="required">*</span>
                </label>
                <input
                  type="number"
                  id="units_required"
                  name="units_required"
                  min="1"
                  max="20"
                  value={form.units_required}
                  onChange={onChange}
                  className={`form-input ${fieldErrors.units_required ? 'error' : ''}`}
                  placeholder="Enter number of units (1-20)"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.units_required}
                  aria-describedby={fieldErrors.units_required ? "units_required_error" : undefined}
                />
                {fieldErrors.units_required && (
                  <span id="units_required_error" className="error-message" role="alert">
                    {fieldErrors.units_required}
                  </span>
                )}
              </div>

              {/* Required By */}
              <div className="form-group">
                <label htmlFor="required_by" className="form-label">
                  Required By <span className="required" aria-label="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="required_by"
                  name="required_by"
                  value={form.required_by}
                  onChange={onChange}
                  className={`form-input ${fieldErrors.required_by ? 'error' : ''}`}
                  min={new Date().toISOString().slice(0, 16)}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.required_by}
                  aria-describedby={fieldErrors.required_by ? "required_by_error" : undefined}
                />
                {fieldErrors.required_by && (
                  <span id="required_by_error" className="error-message" role="alert">
                    {fieldErrors.required_by}
                  </span>
                )}
              </div>

              {/* Urgency Level - Full Width */}
              <div className="form-group full-width">
                <label className="form-label" id="urgency-group-label">
                  Urgency Level <span className="required" aria-label="required">*</span>
                </label>
                <div className="urgency-selector" role="radiogroup" aria-labelledby="urgency-group-label" aria-required="true">
                  {urgencyLevels.map(level => (
                    <label 
                      key={level.value} 
                      className={`urgency-option ${form.urgency === level.value ? 'selected' : ''}`}
                      htmlFor={`urgency-${level.value}`}
                    >
                      <input
                        type="radio"
                        id={`urgency-${level.value}`}
                        name="urgency"
                        value={level.value}
                        checked={form.urgency === level.value}
                        onChange={onChange}
                        aria-label={`Urgency level: ${level.label}`}
                        className="urgency-radio"
                      />
                      <span 
                        className="urgency-badge"
                        style={{ 
                          borderColor: level.color,
                          color: level.color,
                          background: form.urgency === level.value ? level.bg : 'white'
                        }}
                      >
                        <span className="urgency-icon"></span>
                        <span className="urgency-text">{level.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {fieldErrors.urgency && (
                  <span className="error-message" role="alert" id="urgency_error">{fieldErrors.urgency}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="section-title">Contact Information</h3>
                <p className="section-subtitle">Hospital representative contact details</p>
              </div>
            </div>
            
            <div className="form-grid">
              {/* Contact Person */}
              <div className="form-group">
                <label htmlFor="contact_person" className="form-label">
                  Contact Person <span className="required" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={form.contact_person}
                  onChange={onChange}
                  className={`form-input ${fieldErrors.contact_person ? 'error' : ''}`}
                  placeholder="Hospital representative name"
                  maxLength={255}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.contact_person}
                  aria-describedby={fieldErrors.contact_person ? "contact_person_error" : undefined}
                />
                {fieldErrors.contact_person && (
                  <span id="contact_person_error" className="error-message" role="alert">
                    {fieldErrors.contact_person}
                  </span>
                )}
              </div>

              {/* Contact Phone */}
              <div className="form-group">
                <label htmlFor="contact_phone" className="form-label">
                  Contact Phone <span className="required" aria-label="required">*</span>
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={onChange}
                  className={`form-input ${fieldErrors.contact_phone ? 'error' : ''}`}
                  placeholder="+91 XXXXX XXXXX"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.contact_phone}
                  aria-describedby={fieldErrors.contact_phone ? "contact_phone_error" : undefined}
                />
                {fieldErrors.contact_phone && (
                  <span id="contact_phone_error" className="error-message" role="alert">
                    {fieldErrors.contact_phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="section-title">Additional Information</h3>
                <p className="section-subtitle">Optional notes and special requirements</p>
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="description" className="form-label">
                Description <span className="optional">(Optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={onChange}
                className="form-textarea"
                placeholder="Additional notes, diagnosis, special requirements, or any other relevant information..."
                rows="5"
                maxLength="1000"
              />
              <div className="char-count">
                {form.description?.length || 0} / 1000 characters
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
              aria-label="Cancel and go back"
            >
              <ArrowLeft size={18} />
              <span>Cancel</span>
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
              aria-label="Submit blood request"
            >
              {loading ? (
                <>
                  <Loader className="spin" size={18} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Request</span>
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
