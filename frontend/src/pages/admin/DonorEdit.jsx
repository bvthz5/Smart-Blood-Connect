import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  ArrowLeft,
  Save,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Users,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import donorManagementService from '../../services/donorManagementService';
import './DonorEdit.css';

const DonorEditContent = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { donorId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    blood_group: '',
    gender: '',
    date_of_birth: '',
    city: '',
    district: '',
    address: '',
    is_available: true,
    reliability_score: 0,
    last_donation_date: ''
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];
  const districts = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
    'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  useEffect(() => {
    fetchDonorDetails();
  }, [donorId]);

  const fetchDonorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await donorManagementService.getDonorById(donorId);
      
      if (response.success && response.data) {
        const donor = response.data;
        // Extract first and last name from full name if needed
        const nameParts = donor.name ? donor.name.split(' ') : ['', ''];
        const firstName = donor.first_name || nameParts[0] || '';
        const lastName = donor.last_name || nameParts.slice(1).join(' ') || '';
        
        setFormData({
          first_name: firstName,
          last_name: lastName,
          email: donor.email || '',
          phone: donor.phone || '',
          blood_group: donor.blood_group || '',
          gender: donor.gender || '',
          date_of_birth: donor.date_of_birth || '',
          city: donor.city || '',
          district: donor.district || '',
          address: donor.address || '',
          is_available: donor.is_available ?? true,
          reliability_score: donor.reliability_score || 0,
          last_donation_date: donor.last_donation_date || ''
        });
      } else {
        setError('Failed to load donor details');
      }
    } catch (err) {
      console.error('Error fetching donor:', err);
      setError('Failed to load donor details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s-()]{10,}$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    if (!formData.blood_group) {
      errors.blood_group = 'Blood group is required';
    }

    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.district) {
      errors.district = 'District is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Prepare data - only send non-empty values
      const updateData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        // Include the value if it's not an empty string, or if it's a boolean/number
        if (value !== '' || typeof value === 'boolean' || typeof value === 'number') {
          updateData[key] = value;
        }
      });

      const response = await donorManagementService.updateDonor(donorId, updateData);

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/donors');
        }, 1500);
      } else {
        setError(response.message || 'Failed to update donor');
      }
    } catch (err) {
      console.error('Error updating donor:', err);
      setError('Failed to update donor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/donors');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>Loading donor details...</p>
      </div>
    );
  }

  return (
    <div className="donor-edit-container">
      {/* Header */}
      <div className="edit-header">
        <button className="back-button" onClick={handleCancel}>
          <ArrowLeft size={20} />
          <span>Back to Details</span>
        </button>
        <h1 className="edit-title">Edit Donor Information</h1>
        <p className="edit-subtitle">Update donor details and save changes</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <span>Donor updated successfully! Redirecting...</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="edit-form">
        {/* Personal Information */}
        <div className="form-section">
          <div className="section-header">
            <User size={24} />
            <h2>Personal Information</h2>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="first_name">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className={validationErrors.first_name ? 'error' : ''}
                placeholder="Enter first name"
              />
              {validationErrors.first_name && (
                <span className="error-message">{validationErrors.first_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="last_name">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className={validationErrors.last_name ? 'error' : ''}
                placeholder="Enter last name"
              />
              {validationErrors.last_name && (
                <span className="error-message">{validationErrors.last_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="gender">
                Gender <span className="required">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={validationErrors.gender ? 'error' : ''}
              >
                <option value="">Select Gender</option>
                {genders.map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
              {validationErrors.gender && (
                <span className="error-message">{validationErrors.gender}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">
                Date of Birth <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className={validationErrors.date_of_birth ? 'error' : ''}
                />
              </div>
              {validationErrors.date_of_birth && (
                <span className="error-message">{validationErrors.date_of_birth}</span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <div className="section-header">
            <Phone size={24} />
            <h2>Contact Information</h2>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={validationErrors.email ? 'error' : ''}
                  placeholder="email@example.com"
                />
              </div>
              {validationErrors.email && (
                <span className="error-message">{validationErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={validationErrors.phone ? 'error' : ''}
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
              {validationErrors.phone && (
                <span className="error-message">{validationErrors.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="form-section">
          <div className="section-header">
            <MapPin size={24} />
            <h2>Location Information</h2>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="address">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={validationErrors.city ? 'error' : ''}
                placeholder="Enter city"
              />
              {validationErrors.city && (
                <span className="error-message">{validationErrors.city}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="district">
                District <span className="required">*</span>
              </label>
              <select
                id="district"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className={validationErrors.district ? 'error' : ''}
              >
                <option value="">Select District</option>
                {districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              {validationErrors.district && (
                <span className="error-message">{validationErrors.district}</span>
              )}
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="form-section">
          <div className="section-header">
            <Droplets size={24} />
            <h2>Medical Information</h2>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="blood_group">
                Blood Group <span className="required">*</span>
              </label>
              <select
                id="blood_group"
                name="blood_group"
                value={formData.blood_group}
                onChange={handleInputChange}
                className={validationErrors.blood_group ? 'error' : ''}
              >
                <option value="">Select Blood Group</option>
                {bloodGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              {validationErrors.blood_group && (
                <span className="error-message">{validationErrors.blood_group}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reliability_score">
                Reliability Score
              </label>
              <div className="input-with-icon">
                <Shield size={18} />
                <input
                  type="number"
                  id="reliability_score"
                  name="reliability_score"
                  value={formData.reliability_score}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0-100"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="last_donation_date">
                Last Donation Date
              </label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  id="last_donation_date"
                  name="last_donation_date"
                  value={formData.last_donation_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Availability Status */}
        <div className="form-section">
          <div className="section-header">
            <Activity size={24} />
            <h2>Availability Status</h2>
          </div>
          <div className="form-grid">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">Available for Donation</span>
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={saving}
          >
            <X size={20} />
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="spinner-small" size={20} />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const DonorEdit = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DonorEditContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default DonorEdit;
