import React, { useEffect, useState } from 'react';
import donationRequestsService from '../../services/donationRequestsService';
import './RequestsTable.css';

const RequestsTable = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await donationRequestsService.getRequests({ per_page: 10 });
        setRows(data?.items || data?.results || []);
      } catch (e) {
        // no-op
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Recent Requests</h3>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Blood</th>
              <th>Hospital</th>
              <th>Urgency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}>No data</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.patient_name || '-'}</td>
                  <td>{r.blood_group || '-'}</td>
                  <td>{r.hospital_name || '-'}</td>
                  <td>{r.urgency || '-'}</td>
                  <td>{r.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestsTable;
