import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  Check,
  X,
  FileText,
  Clock,
  AlertCircle,
  Download,
  Users,
  UserPlus,
  Ban,
  UserCheck,
  UserX,
  Droplet
} from 'lucide-react';
import hospitalService from '../../services/hospitalService';
import { scheduleTask } from '../../utils/taskScheduler';
import './HospitalDetails.css';

const HospitalDetailsContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [hospital, setHospital] = useState(null);
  const [staff, setStaff] = useState([]);
  const [activeStaff, setActiveStaff] = useState(null);
  const [oldStaff, setOldStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    fetchHospitalDetails();
    fetchStaffMembers();
  }, [id]);

  const fetchHospitalDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hospitalService.getHospitalById(id);
      const hospitalData = response.hospital || response;
      setHospital(hospitalData);
      
      // Do not modify backend verification here; we'll reconcile verification after staff fetch
    } catch (err) {
      console.error('Error fetching hospital details:', err);
      setError(err.response?.data?.error || 'Failed to fetch hospital details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/hospitals');
  };

  const handleEdit = () => {
    navigate(`/admin/hospitals/edit/${id}`);
  };

  const handleDelete = async () => {
    showConfirm(
      `Are you sure you want to delete ${hospital.name}? This action cannot be undone.`,
      async () => {
        try {
          await hospitalService.deleteHospital(id);
          showToast('Hospital deleted successfully!', 'success');
          navigate('/admin/hospitals');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to delete hospital', 'error');
        }
      },
      'Delete'
    );
  };

  const handleToggleVerification = async () => {
    const action = hospital.is_verified ? 'unverify' : 'verify';
    showConfirm(
      `Are you sure you want to ${action} ${hospital.name}?`,
      async () => {
        try {
          await hospitalService.toggleVerification(id, !hospital.is_verified);
          await fetchHospitalDetails();
          showToast(`Hospital ${action}ed successfully!`, 'success');
        } catch (err) {
          showToast(`Failed to ${action} hospital`, 'error');
        }
      },
      action.charAt(0).toUpperCase() + action.slice(1)
    );
  };

  const handleDownloadReport = () => {
    showToast('Download report functionality coming soon!', 'info');
  };

  const fetchStaffMembers = async () => {
    setStaffLoading(true);
    try {
      const response = await hospitalService.getHospitalStaff(id);
      const staffList = response.staff || [];

      // Backend may sometimes return active_staff null for newly created staff
      // Normalize on the client: consider any staff that is not blocked/deleted as the current assigned staff
      const backendActive = response.active_staff && Object.keys(response.active_staff).length !== 0 ? response.active_staff : null;

      // Prefer backendActive when provided, otherwise pick the first non-blocked/non-deleted staff
      const derivedActive = backendActive || staffList.find(s => !s || typeof s !== 'object' ? false : (s.user_status !== 'blocked' && s.user_status !== 'deleted' && s.staff_status !== 'deleted')) || null;

      // Old staff are those who are blocked or deleted (user_status or staff_status indicate removal)
      const derivedOld = staffList.filter(s => s && (s.user_status === 'blocked' || s.user_status === 'deleted' || s.staff_status === 'deleted'));

      // Remove the derivedActive from old list if present
      const filteredOld = derivedOld.filter(o => !derivedActive || o.id !== derivedActive.id);

      setStaff(staffList);
      setActiveStaff(derivedActive);
      setOldStaff(filteredOld);

      console.log('Active Staff (derived):', derivedActive);
      console.log('Old Staff (derived):', filteredOld);

      // Reconcile hospital verification locally so UI reflects expected state
      setHospital((prev) => {
        if (!prev) return prev;
        const hasActiveStaff = !!derivedActive;
        if (hasActiveStaff && !prev.is_verified) {
          return { ...prev, is_verified: true };
        }
        if (!hasActiveStaff && prev.is_verified) {
          return { ...prev, is_verified: false };
        }
        return prev;
      });
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleBlockStaff = async (staffMember) => {
    const action = staffMember.user_status === 'blocked' ? 'unblock' : 'block';
    showConfirm(
      `Are you sure you want to ${action} ${staffMember.name}?`,
      async () => {
        try {
          const response = await hospitalService.toggleStaffBlock(id, staffMember.id);
          await Promise.all([fetchStaffMembers(), fetchHospitalDetails()]);
          showToast(response.message || `Staff member ${action}ed successfully!`, 'success');
        } catch (err) {
          showToast(`Failed to ${action} staff member`, 'error');
        }
      },
      action.charAt(0).toUpperCase() + action.slice(1)
    );
  };

  const handleUpdateStaffStatus = async (staffMember, newStatus) => {
    showConfirm(
      `Are you sure you want to change staff status to ${newStatus}?`,
      async () => {
        try {
          await hospitalService.updateStaffStatus(id, staffMember.id, newStatus);
          await fetchStaffMembers();
          showToast(`Staff status updated to ${newStatus} successfully!`, 'success');
        } catch (err) {
          showToast(`Failed to update staff status`, 'error');
        }
      },
      'Update'
    );
  };

  const handleResendInvitation = async (staffMember) => {
    showConfirm(
      `Resend invitation to ${staffMember.name}?`,
      async () => {
        try {
          await hospitalService.resendInvitation(id, staffMember.id);
          await fetchStaffMembers();
          showToast('Invitation resent successfully!', 'success');
        } catch (err) {
          showToast('Failed to resend invitation', 'error');
        }
      },
      'Resend'
    );
  };

  // Non-blocking deletion flow: show a confirmation modal where the admin types DELETE
  const [showDeleteStaffModal, setShowDeleteStaffModal] = useState(false);
  const [deleteStaffCandidate, setDeleteStaffCandidate] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  // Simple non-blocking toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const handleDeleteStaff = (staffMember) => {
    setDeleteStaffCandidate(staffMember);
    setDeleteConfirmInput('');
    setShowDeleteStaffModal(true);
  };

  const confirmDeleteStaff = async () => {
    if (!deleteStaffCandidate) return;
    if (deleteConfirmInput !== 'DELETE') {
      showToast('You must type DELETE to confirm', 'error');
      return;
    }
    // Close modal and run delete asynchronously to avoid long click handlers
    setShowDeleteStaffModal(false);
    setDeleteProcessing(true);
    scheduleTask(async () => {
      try {
        const response = await hospitalService.deleteStaff(id, deleteStaffCandidate.id);
        await Promise.all([fetchStaffMembers(), fetchHospitalDetails()]);
        showToast(response.message || 'Staff member deleted successfully! Hospital verification updated.', 'success');
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to delete staff member', 'error');
      } finally {
        setDeleteProcessing(false);
      }
    }, 'normal');
  };

  const cancelDeleteStaff = () => {
    setShowDeleteStaffModal(false);
    setDeleteStaffCandidate(null);
    setDeleteConfirmInput('');
  };

  // Generic non-blocking confirm modal state
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null, confirmLabel: 'Confirm', processing: false });

  const showConfirm = (message, onConfirm, confirmLabel = 'Confirm') => {
    setConfirmModal({ show: true, message, onConfirm, confirmLabel, processing: false });
  };

  const handleConfirmCancel = () => {
    setConfirmModal(prev => ({ ...prev, show: false, onConfirm: null, processing: false }));
  };

  const handleConfirmOk = async () => {
    if (!confirmModal.onConfirm) return;
    const onConfirm = confirmModal.onConfirm;
    // Close modal immediately so the click handler returns quickly
    setConfirmModal({ show: false, message: '', onConfirm: null, confirmLabel: 'Confirm', processing: false });
    // Run the confirm action asynchronously via scheduler to avoid long click handlers
    scheduleTask(async () => {
      try {
        await onConfirm();
      } catch (err) {
        console.error('Confirm action failed', err);
      }
    }, 'normal');
  };

  const handleUnblockStaff = async () => {
    showConfirm(
      'Are you sure you want to unblock this staff member and reactivate the hospital?',
      async () => {
        setUnblockLoading(true);
        try {
          await hospitalService.unblockStaff(id);
          // Refresh both hospital details and staff members so UI reflects the change immediately
          await Promise.all([fetchHospitalDetails(), fetchStaffMembers()]);

          // Optimistically update activeStaff if present
          setActiveStaff((prev) => {
            if (!prev) return prev;
            return { ...prev, user_status: 'active', staff_status: 'approved' };
          });

          // Ensure hospital shows verified locally
          setHospital((prev) => (prev ? { ...prev, is_verified: true } : prev));

          showToast('Staff member unblocked successfully! Hospital is now verified.', 'success');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to unblock staff member', 'error');
        } finally {
          setUnblockLoading(false);
        }
      },
      'Unblock'
    );
  };

  const handleAssignStaff = () => {
    // Navigate to Edit Hospital page
    navigate(`/admin/hospitals/edit/${id}`);
  };

  const handleAssignFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await hospitalService.assignStaff(id, assignFormData);
      await fetchStaffMembers();
      setShowAssignModal(false);
      showToast('Staff member assigned successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign staff member', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helpers to normalize status fields from backend objects
  const getUserStatus = (staffObj) => {
    if (!staffObj) return null;
    return staffObj.user_status || staffObj.status || staffObj.user?.status || 'inactive';
  };

  const getHospitalStaffStatus = (staffObj) => {
    if (!staffObj) return null;
    return staffObj.staff_status || staffObj.status || staffObj.hs_status || 'pending';
  };

  if (loading) {
    return (
      <div className="hospital-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading hospital details...</p>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="hospital-details-error">
        <AlertCircle size={48} />
        <h2>Hospital Not Found</h2>
        <p>{error || 'The requested hospital could not be found.'}</p>
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={20} />
          Back to Hospitals
        </button>
      </div>
    );
  }

  return (
    <div className="hospital-details-page">
      {/* Header Section */}
      <div className="hospital-details-header">
        <div className="header-top">
          <button onClick={handleBack} className="btn-back">
            <ArrowLeft size={20} />
            Back to Hospitals
          </button>
          <div className="header-actions">
            <button onClick={handleDownloadReport} className="btn-action btn-download">
              <Download size={18} />
              Download Report
            </button>
            <button onClick={handleEdit} className="btn-action btn-edit">
              <Edit size={18} />
              Edit
            </button>
            <button 
              onClick={handleToggleVerification} 
              className={`btn-action ${hospital.is_verified ? 'btn-unverify' : 'btn-verify'}`}
            >
              {hospital.is_verified ? (
                <>
                  <ShieldOff size={18} />
                  Unverify
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Verify
                </>
              )}
            </button>
            <button onClick={handleDelete} className="btn-action btn-delete">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              <Building2 size={48} />
            </div>
          </div>
          <div className="profile-info">
            <h2 className="hospital-name">{hospital.name}</h2>
            <div className="hospital-address-detail">
              <MapPin size={16} />
              <span>{hospital.address || 'Address not available'}</span>
            </div>
            <div className="hospital-meta">
              <span className="license-badge">
                <FileText size={16} />
                License: {hospital.license_number || 'N/A'}
              </span>
              <span className={`verification-badge ${hospital.is_verified ? 'verified' : 'unverified'}`}>
                {hospital.is_verified ? (
                  <>
                    <Shield size={16} />
                    Verified
                  </>
                ) : (
                  <>
                    <ShieldOff size={16} />
                    Unverified
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Delete Staff Confirmation Modal (non-blocking) */}
      {showDeleteStaffModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <h3>Confirm Permanent Delete</h3>
            <p>
              You are about to permanently delete <strong>{deleteStaffCandidate?.name}</strong>.
              This action is irreversible and may unverify the hospital if there are no active staff members.
            </p>
            <p>Please type <strong>DELETE</strong> to confirm.</p>
            <input
              type="text"
              value={deleteConfirmInput ?? ''}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={cancelDeleteStaff} disabled={deleteProcessing}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteStaff} disabled={deleteProcessing}>
                {deleteProcessing ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Modal (non-blocking) */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <h3>Confirm Action</h3>
            <p>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleConfirmCancel} disabled={confirmModal.processing}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmOk} disabled={confirmModal.processing}>
                {confirmModal.processing ? 'Working…' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="hospital-details-content">
        {/* Contact Information */}
        <div className="details-section">
          <h2 className="section-title">
            <Mail size={20} />
            Contact Information
          </h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Email Address</label>
              <div className="info-value">
                <Mail size={16} />
                <a href={`mailto:${hospital.email}`}>{hospital.email}</a>
              </div>
            </div>
            <div className="info-item">
              <label>Phone Number</label>
              <div className="info-value">
                <Phone size={16} />
                <a href={`tel:${hospital.phone}`}>{hospital.phone}</a>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="details-section">
          <h2 className="section-title">
            <MapPin size={20} />
            Location Details
          </h2>
          <div className="info-grid">
            <div className="info-item full-width">
              <label>Address</label>
              <div className="info-value">
                <MapPin size={16} />
                <span>{hospital.address || 'N/A'}</span>
              </div>
            </div>
            <div className="info-item">
              <label>City</label>
              <div className="info-value">
                <span>{hospital.city || 'N/A'}</span>
              </div>
            </div>
            <div className="info-item">
              <label>District</label>
              <div className="info-value">
                <span>{hospital.district || 'N/A'}</span>
              </div>
            </div>
            <div className="info-item">
              <label>State</label>
              <div className="info-value">
                <span>{hospital.state || 'N/A'}</span>
              </div>
            </div>
            <div className="info-item">
              <label>Pincode</label>
              <div className="info-value">
                <span>{hospital.pincode || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Blood Donation Camp Information */}
        <div className="details-section">
          <h2 className="section-title">
            <Calendar size={20} />
            Blood Donation Camp
          </h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Next Camp Date</label>
              <div className="info-value">
                <Calendar size={16} />
                <span>
                  {hospital.next_camp_date 
                    ? new Date(hospital.next_camp_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Not Scheduled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="details-section">
          <h2 className="section-title">
            <Clock size={20} />
            System Information
          </h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Created At</label>
              <div className="info-value">
                <Calendar size={16} />
                <span>{formatDate(hospital.created_at)}</span>
              </div>
            </div>
            <div className="info-item">
              <label>Last Updated</label>
              <div className="info-value">
                <Calendar size={16} />
                <span>{formatDate(hospital.updated_at)}</span>
              </div>
            </div>
            <div className="info-item">
              <label>Hospital ID</label>
              <div className="info-value">
                <span>#{hospital.id}</span>
              </div>
            </div>
            <div className="info-item">
              <label>Verification Status</label>
              <div className="info-value">
                {hospital.is_verified ? (
                  <span className="status-verified">
                    <Check size={16} />
                    Verified
                  </span>
                ) : (
                  <span className="status-unverified">
                    <X size={16} />
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Staff Status Alert Section */}
        {hospital.staff_status && !hospital.staff_status.is_active && (
          <div className="staff-status-alert-section">
            {!hospital.staff_status.has_staff ? (
              <div className="alert-card alert-warning">
                <div className="alert-icon">
                  <AlertCircle size={32} />
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">⚠️ No Staff Assigned</h3>
                  <p className="alert-message">
                    This hospital does not have any staff member assigned. A staff member is required for the hospital to be verified and operational.
                  </p>
                  <button onClick={handleAssignStaff} className="btn-alert-action btn-primary">
                    <UserPlus size={20} />
                    Assign New Staff Member
                  </button>
                </div>
              </div>
            ) : hospital.staff && hospital.staff.status === 'blocked' ? (
              <div className="alert-card alert-danger">
                <div className="alert-icon">
                  <Ban size={32} />
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">🚫 Staff Member Blocked</h3>
                  <p className="alert-message">
                    The staff member <strong>{hospital.staff.first_name} {hospital.staff.last_name}</strong> ({hospital.staff.email}) is currently blocked. 
                    This hospital cannot operate until the staff member is unblocked or a new staff member is assigned.
                  </p>
                  <div className="alert-actions">
                    <button 
                      onClick={handleUnblockStaff} 
                      className="btn-alert-action btn-success"
                      disabled={unblockLoading}
                    >
                      {unblockLoading ? (
                        <>
                          <div className="spinner-small"></div>
                          Unblocking...
                        </>
                      ) : (
                        <>
                          <UserCheck size={20} />
                          Unblock Staff Member
                        </>
                      )}
                    </button>
                    <button onClick={handleAssignStaff} className="btn-alert-action btn-secondary">
                      <UserPlus size={20} />
                      Assign New Staff
                    </button>
                  </div>
                </div>
              </div>
            ) : !hospital.staff_status.user_exists ? (
              <div className="alert-card alert-danger">
                <div className="alert-icon">
                  <Trash2 size={32} />
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">❌ Staff Member Deleted</h3>
                  <p className="alert-message">
                    The staff member assigned to this hospital has been deleted from the system. 
                    Please assign a new staff member to reactivate this hospital.
                  </p>
                  <button onClick={handleAssignStaff} className="btn-alert-action btn-primary">
                    <UserPlus size={20} />
                    Assign New Staff Member
                  </button>
                </div>
              </div>
            ) : hospital.staff && hospital.staff.status === 'inactive' ? (
              <div className="alert-card alert-info">
                <div className="alert-icon">
                  <UserX size={32} />
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">⏳ Staff Member Inactive</h3>
                  <p className="alert-message">
                    The staff member <strong>{hospital.staff.first_name} {hospital.staff.last_name}</strong> ({hospital.staff.email}) is currently inactive. 
                    They may need to accept their invitation or verify their account.
                  </p>
                  <button 
                    onClick={() => handleResendInvitation({id: hospital.staff.id, name: `${hospital.staff.first_name} ${hospital.staff.last_name}`})} 
                    className="btn-alert-action btn-info"
                  >
                    <Mail size={20} />
                    Resend Invitation
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Staff Management Section */}
        <div className="details-section staff-section">
          <div className="section-header">
            <h2 className="section-title">
              <Users size={20} />
              Staff Members
              <span className="staff-count">{staff.length}</span>
            </h2>
          </div>

          {staffLoading ? (
            <div className="staff-loading">
              <div className="loading-spinner"></div>
              <p>Loading staff members...</p>
            </div>
          ) : !activeStaff && oldStaff.length === 0 ? (
            <div className="no-staff">
              <Users size={48} />
              <p>No staff members assigned to this hospital</p>
              <p className="no-staff-hint">Staff members can be added when editing the hospital</p>
            </div>
          ) : !activeStaff && oldStaff.length > 0 ? (
            <>
              {/* Alert: No Active Staff, Only History */}
              <div className="no-staff-alert">
                <div className="alert-icon-large">
                  <ShieldOff size={64} />
                </div>
                <h3>No Active Staff Member</h3>
                <p>All staff members have been blocked or deleted. This hospital is currently unverified and cannot operate.</p>
                <p className="alert-note">Please assign a new staff member to reactivate this hospital.</p>
                <button onClick={handleAssignStaff} className="btn-alert-action btn-primary">
                  <UserPlus size={20} />
                  Assign New Staff Member
                </button>
              </div>

              {/* Old Staff History Section */}
              {oldStaff.length > 0 && (
                <div className="old-staff-section">
                  <h3 className="subsection-title">
                    <Clock size={18} />
                    Staff History ({oldStaff.length})
                  </h3>
                  <div className="old-staff-grid">
                    {oldStaff.map((oldStaffMember) => (
                      <div key={oldStaffMember.id} className="old-staff-card">
                        <div className="old-staff-header">
                          <div className="old-staff-info">
                            <h4>{oldStaffMember.name}</h4>
                            <p className="old-staff-email">{oldStaffMember.email}</p>
                          </div>
                          <span className={`old-staff-badge ${oldStaffMember.user_status}`}>
                            {oldStaffMember.user_status === 'blocked' ? 'Blocked' : 'Deleted'}
                          </span>
                        </div>
                        <div className="old-staff-note">
                          <AlertCircle size={16} />
                          <p>This staff member is no longer active. View only - no actions available.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Active Staff Section */}
              {activeStaff && (
                <div className="active-staff-section">
                  <h3 className="subsection-title">
                    <UserCheck size={18} />
                    Current Active Staff
                  </h3>
                  <div className="staff-grid-full">
                    <div key={activeStaff.id} className="staff-card-full active-staff-card">
                      {/* Card Header */}
                      <div className="staff-card-header">
                        <div className="staff-avatar-large">
                          <UserCheck size={32} />
                        </div>
                        <div className="staff-header-info">
                          <h3 className="staff-name-large">{activeStaff.name}</h3>
                          <p className="staff-id">Staff ID: #{activeStaff.id}</p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="staff-card-body">
                        {/* Contact Information */}
                        <div className="staff-detail-section">
                          <h4 className="staff-section-title">Contact Information</h4>
                          <div className="staff-detail-grid">
                            <div className="staff-detail-item">
                              <Mail size={16} />
                              <div>
                                <span className="detail-label">Email</span>
                                <span className="detail-value">{activeStaff.email}</span>
                              </div>
                            </div>
                            <div className="staff-detail-item">
                              <Phone size={16} />
                              <div>
                                <span className="detail-label">Phone</span>
                                <span className="detail-value">{activeStaff.phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Information */}
                        <div className="staff-detail-section">
                          <h4 className="staff-section-title">Status Information</h4>
                          <div className="staff-status-grid">
                            {/* User Account Status */}
                            <div className="status-block">
                              <span className="status-label">User Account Status</span>
                              {(() => {
                                const us = getUserStatus(activeStaff);
                                if (us === 'active') {
                                  return (
                                    <span className={`staff-badge user-badge active`}>
                                      <UserCheck size={16} />
                                      Active
                                    </span>
                                  );
                                }
                                if (us === 'inactive') {
                                  return (
                                    <span className={`staff-badge user-badge inactive`}>
                                      <UserCheck size={16} />
                                      Inactive
                                    </span>
                                  );
                                }
                                if (us === 'blocked') {
                                  return (
                                    <span className={`staff-badge user-badge blocked`}>
                                      <Ban size={16} />
                                      Blocked
                                    </span>
                                  );
                                }
                                if (us === 'deleted') {
                                  return (
                                    <span className={`staff-badge user-badge deleted`}>
                                      <UserX size={16} />
                                      Deleted
                                    </span>
                                  );
                                }
                                if (us === 'rejected') {
                                  return (
                                    <span className={`staff-badge user-badge rejected`}>
                                      <UserX size={16} />
                                      Invitation Rejected
                                    </span>
                                  );
                                }
                                return (
                                  <span className={`staff-badge user-badge unknown`}>
                                    <UserCheck size={16} />
                                    {us}
                                  </span>
                                );
                              })()}
                              <p className="status-description">
                                {getUserStatus(activeStaff) === 'active' ? 'User can login to the system' : 'User cannot login until invitation is accepted'}
                              </p>
                            </div>

                            {/* Hospital Staff Status */}
                            <div className="status-block">
                              <span className="status-label">Hospital Staff Status</span>
                              {(() => {
                                const hs = getHospitalStaffStatus(activeStaff);
                                if (hs === 'active') {
                                  return (
                                    <span className={`staff-badge hospital-badge active`}>
                                      <Check size={16} />
                                      Approved & Active
                                    </span>
                                  );
                                }
                                if (hs === 'pending') {
                                  return (
                                    <span className={`staff-badge hospital-badge pending`}>
                                      <Clock size={16} />
                                      Pending
                                    </span>
                                  );
                                }
                                if (hs === 'rejected') {
                                  return (
                                    <span className={`staff-badge hospital-badge rejected`}>
                                      <UserX size={16} />
                                      Rejected
                                    </span>
                                  );
                                }
                                return (
                                  <span className={`staff-badge hospital-badge ${hs}`}>
                                    <Check size={16} />
                                    {hs}
                                  </span>
                                );
                              })()}
                              <p className="status-description">
                                {getHospitalStaffStatus(activeStaff) === 'active' ? 'Staff accepted and active' : 'Staff invitation pending or not accepted'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Activity Information */}
                        {activeStaff.last_login && (
                          <div className="staff-detail-section">
                            <h4 className="staff-section-title">Activity</h4>
                            <div className="staff-activity">
                              <Clock size={16} />
                              <div>
                                <span className="detail-label">Last Login</span>
                                <span className="detail-value">{formatDate(activeStaff.last_login)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer - Actions */}
                      <div className="staff-card-footer">
                        {/* Block Button */}
                        <button
                          onClick={() => handleBlockStaff(activeStaff)}
                          className="staff-btn btn-block"
                        >
                          <Ban size={18} />
                          Block User
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/admin/hospitals/edit/${id}`)}
                          className="staff-btn btn-edit"
                        >
                          <Edit size={18} />
                          Edit Staff
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteStaff(activeStaff)}
                          className="staff-btn btn-delete"
                        >
                          <Trash2 size={18} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Old Staff History Section */}
              {oldStaff.length > 0 && (
                <div className="old-staff-section">
                  <h3 className="subsection-title">
                    <Clock size={18} />
                    Staff History ({oldStaff.length})
                  </h3>
                  <div className="old-staff-grid">
                    {oldStaff.map((oldStaffMember) => (
                      <div key={oldStaffMember.id} className="old-staff-card">
                        <div className="old-staff-header">
                          <div className="old-staff-info">
                            <h4>{oldStaffMember.name}</h4>
                            <p className="old-staff-email">{oldStaffMember.email}</p>
                          </div>
                          <span className={`old-staff-badge ${oldStaffMember.user_status}`}>
                            {oldStaffMember.user_status === 'blocked' ? 'Blocked' : 'Deleted'}
                          </span>
                        </div>
                        <div className="old-staff-note">
                          <AlertCircle size={16} />
                          <p>This staff member is no longer active. View only - no actions available.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast element for non-blocking notifications */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <div style={{ background: toast.type === 'success' ? '#2f855a' : toast.type === 'error' ? '#c53030' : '#2b6cb0', color: 'white', padding: '10px 14px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

const HospitalDetails = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <HospitalDetailsContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default HospitalDetails;
