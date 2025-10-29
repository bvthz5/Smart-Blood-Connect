import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  User,
  Building2,
  Droplets,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCircle,
  Target
} from 'lucide-react';
import donationRequestsService from '../../services/donationRequestsService';
import './RequestDetails.css';

const RequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const data = await donationRequestsService.getRequestDetails(requestId);
      setRequest(data);
      setError(null);
    } catch (err) {
      setError('Failed to load request details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="icon text-success" />;
      case 'pending':
        return <Clock className="icon text-warning" />;
      case 'cancelled':
        return <XCircle className="icon text-error" />;
      default:
        return <AlertCircle className="icon text-muted" />;
    }
  };

  const getUrgencyClass = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-muted';
    }
  };

  if (loading) {
    return <DashboardLayout>Loading request details...</DashboardLayout>;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="error-container">
          <AlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={loadRequestDetails} className="btn-retry">
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return <DashboardLayout>No request found</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="request-details">
        <div className="details-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft /> Back to Matches
          </button>
          <h1>Blood Request #{requestId}</h1>
          <div className="header-status">
            {getStatusIcon(request.status)}
            <span>{request.status}</span>
          </div>
        </div>

        <div className="details-grid">
          {/* Request Information */}
          <div className="details-card">
            <h2>Request Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <Droplets className="icon" />
                <div>
                  <label>Blood Group</label>
                  <span>{request.blood_group}</span>
                </div>
              </div>
              <div className="info-item">
                <Target className="icon" />
                <div>
                  <label>Units Required</label>
                  <span>{request.units_required}</span>
                </div>
              </div>
              <div className="info-item">
                <Calendar className="icon" />
                <div>
                  <label>Required By</label>
                  <span>{new Date(request.required_by).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="info-item">
                <AlertCircle className={`icon ${getUrgencyClass(request.urgency)}`} />
                <div>
                  <label>Urgency</label>
                  <span className={getUrgencyClass(request.urgency)}>{request.urgency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="details-card">
            <h2>Patient Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <User className="icon" />
                <div>
                  <label>Patient Name</label>
                  <span>{request.patient_name}</span>
                </div>
              </div>
              <div className="info-item">
                <Phone className="icon" />
                <div>
                  <label>Contact Phone</label>
                  <span>{request.contact_phone}</span>
                </div>
              </div>
              <div className="info-item full-width">
                <div>
                  <label>Description</label>
                  <p className="description">{request.description || 'No additional details provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Information */}
          <div className="details-card">
            <h2>Hospital Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <Building2 className="icon" />
                <div>
                  <label>Hospital Name</label>
                  <span>{request.hospital.name}</span>
                </div>
              </div>
              <div className="info-item">
                <Phone className="icon" />
                <div>
                  <label>Hospital Phone</label>
                  <span>{request.hospital.phone}</span>
                </div>
              </div>
              <div className="info-item">
                <MapPin className="icon" />
                <div>
                  <label>Location</label>
                  <span>{[request.hospital.city, request.hospital.district].filter(Boolean).join(', ')}</span>
                </div>
              </div>
              <div className="info-item">
                <Mail className="icon" />
                <div>
                  <label>Email</label>
                  <span>{request.hospital.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Information */}
          <div className="details-card">
            <h2>Staff Details</h2>
            <div className="info-grid">
              {request.hospital.staff ? (
                <>
                  <div className="info-item">
                    <UserCircle className="icon" />
                    <div>
                      <label>Staff Name</label>
                      <span>{request.hospital.staff.name}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <Phone className="icon" />
                    <div>
                      <label>Staff Phone</label>
                      <span>{request.hospital.staff.phone}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <Mail className="icon" />
                    <div>
                      <label>Staff Email</label>
                      <span>{request.hospital.staff.email}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="info-item full-width">
                  <p className="no-staff">No staff assigned to this hospital</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RequestDetails;