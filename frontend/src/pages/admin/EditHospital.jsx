import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Shield,
  User,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
  Eye,
  EyeOff,
  Users,
  Lock,
  Calendar
} from 'lucide-react';
import hospitalService from '../../services/hospitalService';
import './EditHospital.css';

const EditHospitalContent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Hospital Data
  const [hospitalData, setHospitalData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    state: '',
    pincode: '',
    license_number: '',
    is_verified: false,
    is_active: true,
    featured: false,
    next_camp_date: '',
    image_url: ''
  });
  
  // Staff/User Data
  const [staffData, setStaffData] = useState({
    user_id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    password: ''
  });
  
  const [hasStaff, setHasStaff] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Kerala districts
  const districts = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur',
    'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad',
    'Kannur', 'Kasaragod'
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  useEffect(() => {
    fetchHospitalDetails();
  }, [id]);

  const fetchHospitalDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching hospital details for ID:', id);
      const response = await hospitalService.getHospitalById(id);
      console.log('Hospital Response:', response);
      
      if (response && response.hospital) {
        const hospital = response.hospital;
        
        // Set hospital data
        const hospitalDataToSet = {
          name: hospital.name || '',
          email: hospital.email || '',
          phone: hospital.phone || '',
          address: hospital.address || '',
          district: hospital.district || '',
          city: hospital.city || '',
          state: hospital.state || '',
          pincode: hospital.pincode || '',
          license_number: hospital.license_number || '',
          is_verified: hospital.is_verified || false,
          is_active: hospital.is_active !== false,
          featured: hospital.featured || false,
          next_camp_date: hospital.next_camp_date ? hospital.next_camp_date.split('T')[0] : '',
          image_url: hospital.image_url || ''
        };
        console.log('Setting hospital data:', hospitalDataToSet);
        setHospitalData(hospitalDataToSet);
        
        // Set staff data if exists
        if (hospital.staff) {
          const staff = hospital.staff;
          setHasStaff(true);
          const staffDataToSet = {
            user_id: staff.id,
            hospital_staff_id: staff.hospital_staff_id,
            first_name: staff.first_name || '',
            last_name: staff.last_name || '',
            email: staff.email || '',
            phone: staff.phone || '',
            status: staff.status || 'active',
            staff_status: staff.staff_status || 'active',
            password: ''
          };
          console.log('Setting staff data:', staffDataToSet);
          setStaffData(staffDataToSet);
        } else {
          setHasStaff(false);
          console.log('No staff assigned to this hospital');
        }
      }
    } catch (err) {
      console.error('Error fetching hospital details:', err);
      setError('Failed to load hospital details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHospitalData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleStaffChange = (e) => {
    const { name, value } = e.target;
    setStaffData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[`staff_${name}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`staff_${name}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!hospitalData.name.trim()) errors.name = 'Hospital name is required';
    if (!hospitalData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(hospitalData.email)) errors.email = 'Invalid email format';
    if (!hospitalData.phone.trim()) errors.phone = 'Phone number is required';
    if (!hospitalData.address.trim()) errors.address = 'Address is required';
    if (!hospitalData.district) errors.district = 'District is required';
    if (!hospitalData.city.trim()) errors.city = 'City is required';
    if (!hospitalData.license_number.trim()) errors.license_number = 'License number is required';
    
    if (hasStaff) {
      if (!staffData.first_name.trim()) errors.staff_first_name = 'First name is required';
      if (!staffData.last_name.trim()) errors.staff_last_name = 'Last name is required';
      if (!staffData.email.trim()) errors.staff_email = 'Staff email is required';
      else if (!/\S+@\S+\.\S+/.test(staffData.email)) errors.staff_email = 'Invalid email format';
      if (!staffData.phone.trim()) errors.staff_phone = 'Staff phone is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix all validation errors');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      console.log('Updating hospital with data:', hospitalData);
      
      // Update hospital data
      await hospitalService.updateHospital(id, hospitalData);
      console.log('Hospital updated successfully');
      
      // Update staff data if staff exists
      let staffUpdateResponse = null;
      if (hasStaff && staffData.user_id) {
        console.log('Updating staff with data:', staffData);
        
        const staffUpdateData = {
          first_name: staffData.first_name,
          last_name: staffData.last_name,
          email: staffData.email,
          phone: staffData.phone
        };
        
        staffUpdateResponse = await hospitalService.updateHospitalStaff(id, staffData.user_id, staffUpdateData);
        console.log('Staff updated successfully:', staffUpdateResponse);
        
        // Show detailed message if credentials changed
        if (staffUpdateResponse.credentials_changed) {
          if (staffUpdateResponse.email_sent) {
            setError(null);
            setSuccess(true);
            alert('✅ Staff credentials updated! New password has been generated and sent to the staff email address.');
          } else {
            alert('⚠️ Staff credentials updated with new password, but email notification failed. Please inform the staff manually.');
          }
        }
      }
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/admin/hospitals');
      }, 2000);
      
    } catch (err) {
      console.error('Error updating hospital:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to update hospital. Please try again.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/admin/hospitals');
    }
  };

  if (loading) {
    return (
      <div className="edit-hospital-page-loading">
        <Loader className="edit-hospital-spinner" size={48} />
        <p>Loading hospital details...</p>
      </div>
    );
  }

  return (
    <div className={`edit-hospital-page ${theme}`}>
      <div className="edit-hospital-wrapper">
        {/* Header */}
        <div className="edit-hospital-page-header">
          <button className="edit-hospital-back-btn" onClick={handleCancel}>
            <ArrowLeft size={20} />
            <span>Back to Hospitals</span>
          </button>
          <div className="edit-hospital-title-section">
            <div className="edit-hospital-title-icon">
              <Building2 size={32} />
            </div>
            <div className="edit-hospital-title-text">
              <h1>Edit Hospital</h1>
              <p>Update hospital and staff information</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="edit-hospital-alert edit-hospital-alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        
        {success && (
          <div className="edit-hospital-alert edit-hospital-alert-success">
            <CheckCircle size={20} />
            <span>Hospital updated successfully! Redirecting...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="edit-hospital-form-container">
          {/* Hospital Section */}
          <div className="edit-hospital-card">
            <div className="edit-hospital-card-header">
              <div className="edit-hospital-card-icon hospital-icon">
                <Building2 size={24} />
              </div>
              <div className="edit-hospital-card-title">
                <h2>Hospital Information</h2>
                <p>Basic details about the hospital</p>
              </div>
            </div>

            <div className="edit-hospital-form-grid">
              {/* Hospital Name */}
              <div className="edit-hospital-field full-width">
                <label>Hospital Name <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <Building2 size={18} className="edit-hospital-input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={hospitalData.name}
                    onChange={handleHospitalChange}
                    placeholder="Enter hospital name"
                    className={validationErrors.name ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.name && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="edit-hospital-field">
                <label>Email Address <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <Mail size={18} className="edit-hospital-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={hospitalData.email}
                    onChange={handleHospitalChange}
                    placeholder="hospital@example.com"
                    className={validationErrors.email ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.email && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.email}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div className="edit-hospital-field">
                <label>Phone Number <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <Phone size={18} className="edit-hospital-input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={hospitalData.phone}
                    onChange={handleHospitalChange}
                    placeholder="+91 1234567890"
                    className={validationErrors.phone ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.phone && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.phone}
                  </span>
                )}
              </div>

              {/* License Number */}
              <div className="edit-hospital-field">
                <label>License Number <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <FileText size={18} className="edit-hospital-input-icon" />
                  <input
                    type="text"
                    name="license_number"
                    value={hospitalData.license_number}
                    onChange={handleHospitalChange}
                    placeholder="Enter license number"
                    className={validationErrors.license_number ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.license_number && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.license_number}
                  </span>
                )}
              </div>

              {/* Address */}
              <div className="edit-hospital-field full-width">
                <label>Address <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <MapPin size={18} className="edit-hospital-input-icon" />
                  <textarea
                    name="address"
                    value={hospitalData.address}
                    onChange={handleHospitalChange}
                    placeholder="Enter complete address"
                    rows="3"
                    className={validationErrors.address ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.address && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.address}
                  </span>
                )}
              </div>

              {/* District */}
              <div className="edit-hospital-field">
                <label>District <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <MapPin size={18} className="edit-hospital-input-icon" />
                  <select
                    name="district"
                    value={hospitalData.district}
                    onChange={handleHospitalChange}
                    className={validationErrors.district ? 'edit-hospital-input-error' : ''}
                  >
                    <option value="">Select District</option>
                    {districts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
                {validationErrors.district && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.district}
                  </span>
                )}
              </div>

              {/* City */}
              <div className="edit-hospital-field">
                <label>City <span className="edit-hospital-required">*</span></label>
                <div className="edit-hospital-input-group">
                  <MapPin size={18} className="edit-hospital-input-icon" />
                  <input
                    type="text"
                    name="city"
                    value={hospitalData.city}
                    onChange={handleHospitalChange}
                    placeholder="Enter city"
                    className={validationErrors.city ? 'edit-hospital-input-error' : ''}
                  />
                </div>
                {validationErrors.city && (
                  <span className="edit-hospital-error-text">
                    <AlertCircle size={14} />
                    {validationErrors.city}
                  </span>
                )}
              </div>

              {/* State */}
              <div className="edit-hospital-field">
                <label>State</label>
                <div className="edit-hospital-input-group">
                  <MapPin size={18} className="edit-hospital-input-icon" />
                  <input
                    type="text"
                    name="state"
                    value={hospitalData.state}
                    onChange={handleHospitalChange}
                    placeholder="Enter state"
                  />
                </div>
              </div>

              {/* Pincode */}
              <div className="edit-hospital-field">
                <label>Pincode</label>
                <div className="edit-hospital-input-group">
                  <MapPin size={18} className="edit-hospital-input-icon" />
                  <input
                    type="text"
                    name="pincode"
                    value={hospitalData.pincode}
                    onChange={handleHospitalChange}
                    placeholder="Enter pincode"
                    maxLength="10"
                  />
                </div>
              </div>

              {/* Next Camp Date */}
              <div className="edit-hospital-field">
                <label>Next Camp Date</label>
                <div className="edit-hospital-input-group edit-hospital-date-wrapper">
                  <Calendar size={18} className="edit-hospital-input-icon" />
                  <input
                    ref={(el) => {
                      if (el) el.dateInputRef = el;
                    }}
                    type="date"
                    name="next_camp_date"
                    value={hospitalData.next_camp_date}
                    onChange={handleHospitalChange}
                    onKeyDown={(e) => e.preventDefault()}
                    className="edit-hospital-date-input"
                  />
                  <button
                    type="button"
                    className="edit-hospital-date-picker-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.previousElementSibling;
                      if (input) {
                        input.showPicker?.() || input.click();
                      }
                    }}
                    title="Select date from calendar"
                  >
                    <Calendar size={20} />
                  </button>
                </div>
                <span className="edit-hospital-help-text">Click the calendar icon to select a date</span>
              </div>

              {/* Status Toggles */}
              <div className="edit-hospital-field full-width">
                <label>Status & Features</label>
                <div className="edit-hospital-toggles">
                  <div className="edit-hospital-toggle-item">
                    <input
                      type="checkbox"
                      id="is_verified"
                      name="is_verified"
                      checked={hospitalData.is_verified}
                      onChange={handleHospitalChange}
                    />
                    <label htmlFor="is_verified">
                      <Shield size={18} />
                      <span>Verified Hospital</span>
                    </label>
                  </div>

                  <div className="edit-hospital-toggle-item">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={hospitalData.is_active}
                      onChange={handleHospitalChange}
                    />
                    <label htmlFor="is_active">
                      <CheckCircle size={18} />
                      <span>Active Status</span>
                    </label>
                  </div>

                  <div className="edit-hospital-toggle-item">
                    <input
                      type="checkbox"
                      id="featured"
                      name="featured"
                      checked={hospitalData.featured}
                      onChange={handleHospitalChange}
                    />
                    <label htmlFor="featured">
                      <Building2 size={18} />
                      <span>Featured Hospital</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Section */}
          {hasStaff ? (
            <div className="edit-hospital-card">
              <div className="edit-hospital-card-header">
                <div className="edit-hospital-card-icon staff-icon">
                  <Users size={24} />
                </div>
                <div className="edit-hospital-card-title">
                  <h2>Staff Information</h2>
                  <p>Manage hospital staff member details</p>
                </div>
              </div>

              {/* Staff Details Display */}
              {staffData.user_id && (
                <div className="edit-hospital-staff-info">
                  <div className="staff-info-row">
                    <div className="staff-info-item">
                      <span className="staff-info-label">User ID:</span>
                      <span className="staff-info-value">#{staffData.user_id}</span>
                    </div>
                    <div className="staff-info-item">
                      <span className="staff-info-label">Account Status:</span>
                      <span className={`staff-info-badge ${staffData.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {staffData.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="edit-hospital-form-grid">
                {/* First Name */}
                <div className="edit-hospital-field">
                  <label>First Name <span className="edit-hospital-required">*</span></label>
                  <div className="edit-hospital-input-group">
                    <User size={18} className="edit-hospital-input-icon" />
                    <input
                      type="text"
                      name="first_name"
                      value={staffData.first_name}
                      onChange={handleStaffChange}
                      placeholder="Enter first name"
                      className={validationErrors.staff_first_name ? 'edit-hospital-input-error' : ''}
                    />
                  </div>
                  {validationErrors.staff_first_name && (
                    <span className="edit-hospital-error-text">
                      <AlertCircle size={14} />
                      {validationErrors.staff_first_name}
                    </span>
                  )}
                </div>

                {/* Last Name */}
                <div className="edit-hospital-field">
                  <label>Last Name <span className="edit-hospital-required">*</span></label>
                  <div className="edit-hospital-input-group">
                    <User size={18} className="edit-hospital-input-icon" />
                    <input
                      type="text"
                      name="last_name"
                      value={staffData.last_name}
                      onChange={handleStaffChange}
                      placeholder="Enter last name"
                      className={validationErrors.staff_last_name ? 'edit-hospital-input-error' : ''}
                    />
                  </div>
                  {validationErrors.staff_last_name && (
                    <span className="edit-hospital-error-text">
                      <AlertCircle size={14} />
                      {validationErrors.staff_last_name}
                    </span>
                  )}
                </div>

                {/* Staff Email */}
                <div className="edit-hospital-field">
                  <label>Email Address <span className="edit-hospital-required">*</span></label>
                  <div className="edit-hospital-input-group">
                    <Mail size={18} className="edit-hospital-input-icon" />
                    <input
                      type="email"
                      name="email"
                      value={staffData.email}
                      onChange={handleStaffChange}
                      placeholder="staff@example.com"
                      className={validationErrors.staff_email ? 'edit-hospital-input-error' : ''}
                    />
                  </div>
                  {validationErrors.staff_email && (
                    <span className="edit-hospital-error-text">
                      <AlertCircle size={14} />
                      {validationErrors.staff_email}
                    </span>
                  )}
                </div>

                {/* Staff Phone */}
                <div className="edit-hospital-field">
                  <label>Phone Number <span className="edit-hospital-required">*</span></label>
                  <div className="edit-hospital-input-group">
                    <Phone size={18} className="edit-hospital-input-icon" />
                    <input
                      type="tel"
                      name="phone"
                      value={staffData.phone}
                      onChange={handleStaffChange}
                      placeholder="+91 1234567890"
                      className={validationErrors.staff_phone ? 'edit-hospital-input-error' : ''}
                    />
                  </div>
                  {validationErrors.staff_phone && (
                    <span className="edit-hospital-error-text">
                      <AlertCircle size={14} />
                      {validationErrors.staff_phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="edit-hospital-card edit-hospital-no-staff">
              <div className="edit-hospital-no-staff-content">
                <Users size={48} />
                <h3>No Staff Assigned</h3>
                <p>This hospital doesn't have a staff member assigned yet. You can assign staff from the hospital details page.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="edit-hospital-actions">
            <button
              type="button"
              className="edit-hospital-btn-cancel"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={20} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="edit-hospital-btn-save"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader className="edit-hospital-spinner" size={20} />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditHospital = () => {
  return (
    <DashboardLayout>
      <EditHospitalContent />
    </DashboardLayout>
  );
};

export default EditHospital;
