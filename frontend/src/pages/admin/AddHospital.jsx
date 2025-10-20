import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import SuccessModal from '../../components/SuccessModal';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  User,
  UserPlus,
  Trash2,
  Save,
  AlertCircle
} from 'lucide-react';
import hospitalService from '../../services/hospitalService';
import './AddHospital.css';

const AddHospitalContent = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});
  
  // Hospital form data
  const [hospitalData, setHospitalData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    license_number: '',
    contact_number: ''
  });

  // Single staff member (one per hospital)
  const [staffMember, setStaffMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  const handleHospitalChange = (e) => {
    const { name, value } = e.target;
    setHospitalData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[`hospital_${name}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`hospital_${name}`];
        return newErrors;
      });
    }
  };

  const handleStaffChange = (field, value) => {
    setStaffMember(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[`staff_${field}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`staff_${field}`];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      // Client-side validation
      const errors = {};
      
      // Validate hospital fields
      if (!hospitalData.name?.trim()) errors.hospital_name = 'Hospital name is required';
      if (!hospitalData.email?.trim()) errors.hospital_email = 'Hospital email is required';
      if (!hospitalData.phone?.trim()) errors.hospital_phone = 'Hospital phone is required';
      if (!hospitalData.address?.trim()) errors.hospital_address = 'Hospital address is required';
      if (!hospitalData.city?.trim()) errors.hospital_city = 'City is required';
      if (!hospitalData.district?.trim()) errors.hospital_district = 'District is required';
      
      // Validate staff fields
      if (!staffMember.first_name?.trim()) errors.staff_first_name = 'Staff first name is required';
      if (!staffMember.email?.trim()) errors.staff_email = 'Staff email is required';
      if (!staffMember.phone?.trim()) errors.staff_phone = 'Staff phone is required';
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const payload = {
        hospital: hospitalData,
        staff: staffMember  // Single staff member
      };

      console.log('Sending hospital creation payload:', payload);
      console.log('Hospital data:', hospitalData);
      console.log('Staff data:', staffMember);

      const response = await hospitalService.createHospitalWithStaff(payload);
      
      console.log('Response from API:', response);
      
      // Validate response
      if (!response || !response.hospital || !response.staff) {
        throw new Error('Invalid response from server');
      }
      
      // Get password from response (backend should always return it)
      const password = response.staff.temp_password;
      
      // Check if email was sent successfully
      if (response.email_sent) {
        setModalData({
          type: 'success',
          title: '✅ Success!',
          message: `Hospital "${response.hospital.name}" created successfully!`,
          details: (
            <div>
              <p><strong>📧 Email Status:</strong> Invitation sent successfully</p>
              <p><strong>Staff Name:</strong> {response.staff.name}</p>
              <p><strong>Staff Email:</strong> {response.staff.email}</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '10px' }}>
                💡 Login credentials have been emailed to the staff member
              </p>
            </div>
          )
        });
      } else {
        // Hospital created but email failed
        setModalData({
          type: 'warning',
          title: '⚠️ Hospital Created',
          message: `Hospital "${response.hospital.name}" created successfully, but email failed to send.`,
          details: (
            <div>
              <p><strong>⚠️ Email Failed:</strong> Please manually provide the login credentials to the staff</p>
              <div className="credentials">
                <p><strong>Staff Email:</strong> {response.staff.email}</p>
                <p><strong>Temporary Password:</strong> {password}</p>
              </div>
              <div className="error-message">
                <strong>Error:</strong> {response.email_error || 'Unknown error'}
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '10px' }}>
                ⚠️ Please save these credentials and share them securely with the staff member
              </p>
            </div>
          )
        });
      }
      
      setShowModal(true);
    } catch (err) {
      console.error('Hospital creation error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      const errorData = err.response?.data;
      
      if (errorData?.field) {
        // Field-specific error
        setFieldErrors({ [errorData.field]: errorData.error });
        setError(errorData.error);
      } else {
        // General error
        const errorMessage = errorData?.message || errorData?.error || err.message || 'Failed to create hospital';
        setError(errorMessage);
        console.error('Final error message:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    navigate('/admin/hospitals');
  }, [navigate]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    navigate('/admin/hospitals');
  }, [navigate]);

  // Helper function to render field error
  const renderFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      return (
        <div className="field-error">
          <AlertCircle size={14} />
          <span>{fieldErrors[fieldName]}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`add-hospital-container ${theme}`}>
      <div className="add-hospital-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Hospitals
        </button>
        <h1 className="page-title">
          <Building2 size={28} />
          Add New Hospital
        </h1>
        <p className="page-subtitle">Create a new hospital and assign staff members</p>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-hospital-form">
        {/* Hospital Information Section */}
        <div className="form-section">
          <div className="section-header">
            <Building2 size={24} />
            <h2>Hospital Information</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Hospital Name *</label>
              <input
                type="text"
                name="name"
                value={hospitalData.name}
                onChange={handleHospitalChange}
                required
                placeholder="Enter hospital name"
                className={fieldErrors.hospital_name ? 'error' : ''}
              />
              {renderFieldError('hospital_name')}
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  value={hospitalData.email}
                  onChange={handleHospitalChange}
                  required
                  placeholder="hospital@example.com"
                  className={fieldErrors.hospital_email ? 'error' : ''}
                />
              </div>
              {renderFieldError('hospital_email')}
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={hospitalData.phone}
                  onChange={handleHospitalChange}
                  required
                  placeholder="+91 9876543210"
                  className={fieldErrors.hospital_phone ? 'error' : ''}
                />
              </div>
              {renderFieldError('hospital_phone')}
            </div>

            <div className="form-group">
              <label>Contact Number</label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input
                  type="tel"
                  name="contact_number"
                  value={hospitalData.contact_number}
                  onChange={handleHospitalChange}
                  placeholder="Alternative contact"
                />
              </div>
            </div>

            <div className="form-group">
              <label>License Number</label>
              <div className="input-with-icon">
                <FileText size={18} />
                <input
                  type="text"
                  name="license_number"
                  value={hospitalData.license_number}
                  onChange={handleHospitalChange}
                  placeholder="Hospital license number"
                  className={fieldErrors.hospital_license_number ? 'error' : ''}
                />
              </div>
              {renderFieldError('hospital_license_number')}
            </div>

            <div className="form-group full-width">
              <label>Address *</label>
              <div className="input-with-icon">
                <MapPin size={18} />
                <textarea
                  name="address"
                  value={hospitalData.address}
                  onChange={handleHospitalChange}
                  required
                  rows="3"
                  placeholder="Enter complete address"
                  className={fieldErrors.hospital_address ? 'error' : ''}
                />
              </div>
              {renderFieldError('hospital_address')}
            </div>

            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={hospitalData.city}
                onChange={handleHospitalChange}
                required
                placeholder="Enter city"
                className={fieldErrors.hospital_city ? 'error' : ''}
              />
              {renderFieldError('hospital_city')}
            </div>

            <div className="form-group">
              <label>District *</label>
              <select
                name="district"
                value={hospitalData.district}
                onChange={handleHospitalChange}
                required
                className={fieldErrors.hospital_district ? 'error' : ''}
              >
                <option value="">Select District</option>
                <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                <option value="Kollam">Kollam</option>
                <option value="Pathanamthitta">Pathanamthitta</option>
                <option value="Alappuzha">Alappuzha</option>
                <option value="Kottayam">Kottayam</option>
                <option value="Idukki">Idukki</option>
                <option value="Ernakulam">Ernakulam</option>
                <option value="Thrissur">Thrissur</option>
                <option value="Palakkad">Palakkad</option>
                <option value="Malappuram">Malappuram</option>
                <option value="Kozhikode">Kozhikode</option>
                <option value="Wayanad">Wayanad</option>
                <option value="Kannur">Kannur</option>
                <option value="Kasaragod">Kasaragod</option>
              </select>
              {renderFieldError('hospital_district')}
            </div>
          </div>
        </div>

        {/* Staff Members Section */}
        <div className="form-section">
          <div className="section-header">
            <User size={24} />
            <h2>Staff Members</h2>
          </div>
          
          <p className="section-description">
            Add the staff member who will manage this hospital. The staff member will receive an email invitation with auto-generated credentials.
          </p>

          <div className="staff-member-card">
            <div className="staff-card-header">
              <h3>Hospital Staff Information</h3>
            </div>

            <div className="staff-form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={staffMember.first_name}
                  onChange={(e) => handleStaffChange('first_name', e.target.value)}
                  required
                  placeholder="Enter first name"
                  className={fieldErrors.staff_first_name ? 'error' : ''}
                />
                {renderFieldError('staff_first_name')}
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={staffMember.last_name}
                  onChange={(e) => handleStaffChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={staffMember.email}
                    onChange={(e) => handleStaffChange('email', e.target.value)}
                    required
                    placeholder="staff@example.com"
                    className={fieldErrors.staff_email ? 'error' : ''}
                  />
                </div>
                {renderFieldError('staff_email')}
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="tel"
                    value={staffMember.phone}
                    onChange={(e) => handleStaffChange('phone', e.target.value)}
                    required
                    placeholder="+91 9876543210"
                    className={fieldErrors.staff_phone ? 'error' : ''}
                  />
                </div>
                {renderFieldError('staff_phone')}
              </div>
            </div>

            <div className="staff-note">
              <AlertCircle size={16} />
              <span>An auto-generated password will be sent to this email address</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleBack}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating Hospital...
              </>
            ) : (
              <>
                <Save size={20} />
                Create Hospital & Send Invitations
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success/Warning Modal */}
      <SuccessModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={modalData.title}
        message={modalData.message}
        details={modalData.details}
        type={modalData.type}
      />
    </div>
  );
};

const AddHospital = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <AddHospitalContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default AddHospital;
