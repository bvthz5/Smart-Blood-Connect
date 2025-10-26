import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import './ViewRequests.css';

const ViewRequests = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const location = useLocation();
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [blood, setBlood] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.listRequests();
        setRows(data?.items || data?.results || []);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(location.search || '');
    const s = sp.get('search') || sp.get('q') || '';
    if (s) setQ(s);
  }, [location.search]);

  const filtered = useMemo(() => {
    const QQ = (q||'').toLowerCase();
    return rows.filter(r => {
      const name = (r.patient_name||'').toLowerCase();
      const ref = (r.patient_ref||'').toLowerCase();
      const idStr = String(r.id||'');
      const matchText = !QQ || name.includes(QQ) || ref.includes(QQ) || idStr.includes(QQ);
      return (
        matchText &&
        (!status || (r.status||'') === status) &&
        (!urgency || (r.urgency||'') === urgency) &&
        (!blood || (r.blood_group||'') === blood)
      );
    });
  }, [rows, q, status, urgency, blood]);

  const onLogout = () => { localStorage.removeItem('seeker_token'); localStorage.removeItem('token'); localStorage.removeItem('seeker_refresh_token'); window.location.href = '/seeker/login'; };
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page-1)*pageSize, page*pageSize);

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="card toolbar">
          <input placeholder="Search patient ref" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">All status</option>
            {['Active','Matched','Completed','Cancelled'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={urgency} onChange={(e)=>setUrgency(e.target.value)}>
            <option value="">All urgency</option>
            {['NORMAL','URGENT','EMERGENCY'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={blood} onChange={(e)=>setBlood(e.target.value)}>
            <option value="">All groups</option>
            {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg=> <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient Ref</th>
                <th>Group</th>
                <th>Units</th>
                <th>Urgency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Loading…</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={6}>No data</td></tr>
              ) : (
                pageRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.patient_ref}</td>
                    <td>{r.blood_group}</td>
                    <td>{r.units}</td>
                    <td><span className={`pill ${String(r.urgency||'').toLowerCase()}`}>{r.urgency}</span></td>
                    <td><span className={`pill status ${String(r.status||'').toLowerCase()}`}>{r.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="pager">
            <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default ViewRequests;
