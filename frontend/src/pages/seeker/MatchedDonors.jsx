import React, { useEffect, useState } from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import './MatchedDonors.css';

const barColor = (score) => score > 80 ? '#16a34a' : score > 60 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444';

const MatchedDonors = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.listMatches();
        setRows(data?.items || data?.results || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const onLogout = () => { localStorage.removeItem('seeker_token'); localStorage.removeItem('token'); localStorage.removeItem('seeker_refresh_token'); window.location.href = '/seeker/login'; };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="card table-card">
          <div className="table-header">Matched Donors</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Donor ID</th>
                  <th>Blood Group</th>
                  <th>Distance</th>
                  <th>Match Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5}>No matches</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.obfuscated_id || `D-${r.id}`}</td>
                      <td>{r.blood_group}</td>
                      <td>{r.distance_km ? `${r.distance_km} km` : '-'}</td>
                      <td>
                        <div className="score-cell">
                          <div className="bar" style={{width: `${r.score||0}%`, background: barColor(r.score||0)}} />
                          <span>{r.score || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-primary">Contact Donor</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default MatchedDonors;
