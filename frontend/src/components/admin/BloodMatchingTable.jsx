import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Check, 
  X,
  AlertCircle,
  User,
  Building2,
  Droplets,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import donationRequestsService from '../../services/donationRequestsService';
import './BloodMatchingTable.css';

const BloodMatchingTable = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await donationRequestsService.getPendingMatches();
      setRequests(response.matches || []);
      setError(null);
    } catch (err) {
      setError('Failed to load blood match requests');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (requestId) => {
    navigate(`/admin/requests/${requestId}`);
  };

  const handleAcceptMatch = async (matchId) => {
    try {
      await donationRequestsService.acceptMatch(matchId);
      loadRequests(); // Reload the list
    } catch (err) {
      console.error('Error accepting match:', err);
      // Show error toast/notification
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    
    try {
      await donationRequestsService.deleteMatch(matchId);
      loadRequests(); // Reload the list
    } catch (err) {
      console.error('Error deleting match:', err);
      // Show error toast/notification
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="status-icon text-success" />;
      case 'pending':
        return <Clock className="status-icon text-warning" />;
      case 'cancelled':
        return <XCircle className="status-icon text-error" />;
      default:
        return <AlertCircle className="status-icon text-muted" />;
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
    return <div className="table-loading">Loading blood match requests...</div>;
  }

  if (error) {
    return (
      <div className="table-error">
        <AlertCircle className="error-icon" />
        <p>{error}</p>
        <button onClick={loadRequests} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="blood-matching-table">
      <div className="table-header">
        <h2 className="table-title">Blood Match Requests</h2>
        <div className="header-actions">
          <button 
            onClick={loadRequests}
            className="btn-refresh"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Patient Details</th>
              <th>Hospital</th>
              <th>Blood Group</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  No pending blood match requests
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id}>
                  <td>#{request.id}</td>
                  <td>
                    <div className="patient-info">
                      <User className="icon" />
                      <div>
                        <div className="patient-name">{request.patient_name}</div>
                        <div className="patient-contact">{request.contact_phone}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="hospital-info">
                      <Building2 className="icon" />
                      <div>
                        <div className="hospital-name">{request.hospital.name}</div>
                        <div className="hospital-location">{request.hospital.city}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="blood-group">
                      <Droplets className="icon" />
                      <span>{request.blood_group}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`urgency ${getUrgencyClass(request.urgency)}`}>
                      {request.urgency}
                    </div>
                  </td>
                  <td>
                    <div className="status">
                      {getStatusIcon(request.status)}
                      <span>{request.status}</span>
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleViewDetails(request.id)}
                        className="btn-icon"
                        title="View Details"
                      >
                        <Eye />
                      </button>
                      <button
                        onClick={() => handleAcceptMatch(request.id)}
                        className="btn-icon"
                        title="Accept Match"
                      >
                        <Check />
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(request.id)}
                        className="btn-icon text-error"
                        title="Delete Match"
                      >
                        <X />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BloodMatchingTable;