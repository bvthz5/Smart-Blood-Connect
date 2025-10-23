import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SeekerLayout from "../../components/seeker/SeekerLayout";
import SeekerNavbar from "../../components/seeker/SeekerNavbar";
import SeekerSidebar from "../../components/seeker/SeekerSidebar";
import KpiCard from "../../components/seeker/KpiCard";
import { DemandByGroup, MonthlyTrend } from "../../components/seeker/Charts";
import ActivityFeed from "../../components/seeker/ActivityFeed";
import seekerService from "../../services/seekerService";
import { redirectToLogin } from '../../utils/authRedirect';
import "./SeekerDashboard.css";

export default function SeekerDashboard() {
  const onLogout = () => {
    localStorage.removeItem('seeker_token');
    redirectToLogin();
  };
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ urgent: 0, total: 0, matched: 0, lastWeek: 0 });
  const [counts, setCounts] = useState({ active: 0, completed: 0, pendingMatches: 0 });
  const [pie, setPie] = useState([]);
  const [trend, setTrend] = useState({ labels: [], data: [] });
  const [activity, setActivity] = useState([]);
  const [topBlood, setTopBlood] = useState('—');
  const [insights, setInsights] = useState({ donors: 0, avgScore: 0 });

  async function load() {
    try {
      const [dash, reqRes, matchRes] = await Promise.all([
        seekerService.dashboard().catch(() => ({})),
        seekerService.listRequests().catch(() => ({})),
        seekerService.listMatches().catch(() => ({})),
      ]);
      const data = dash || {};
      setKpis({
        urgent: data?.urgent_requests ?? 0,
        total: data?.total_requests ?? 0,
        matched: data?.confirmed_matches ?? 0,
        lastWeek: data?.requests_last_7d ?? 0
      });
      const demand = data?.demand_by_group || [];
      setPie(demand);
      setTrend({ labels: data?.monthly?.labels || [], data: data?.monthly?.data || [] });
      setActivity(data?.activity || []);

      // Derive counts
      const reqs = reqRes?.items || reqRes?.results || [];
      const matches = matchRes?.items || matchRes?.results || [];
      const activeStatuses = new Set(['pending','matched','active','open','inprogress']);
      const completedStatuses = new Set(['completed','fulfilled','closed']);
      const act = reqs.filter(r => activeStatuses.has(String(r.status||'').toLowerCase())).length;
      const comp = reqs.filter(r => completedStatuses.has(String(r.status||'').toLowerCase())).length;
      const pend = (() => {
        const withStatus = matches.filter(m => m.status || m.response);
        if (withStatus.length > 0) {
          return withStatus.filter(m => String(m.status || m.response || '').toLowerCase() === 'pending').length;
        }
        return matches.length || 0;
      })();
      setCounts({ active: act, completed: comp, pendingMatches: pend });

      // Top blood group
      let top = '—';
      if (Array.isArray(demand) && demand.length > 0) {
        let best = demand[0];
        const val = (x) => Number(x?.count ?? x?.value ?? x?.demand ?? x?.total ?? 0);
        for (const d of demand) if (val(d) > val(best)) best = d;
        top = best?.group || best?.blood_group || best?.label || '—';
      }
      setTopBlood(top);

      // Donor insights
      const numericScores = (matches || [])
        .map(m => (m?.score ?? m?.match_score ?? m?.ml_score ?? null))
        .filter(v => typeof v === 'number');
      const donors = matches?.length || 0;
      const avgScore = numericScores.length ? Math.round(numericScores.reduce((a,b)=>a+b,0) / numericScores.length) : 0;
      setInsights({ donors, avgScore });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { load(); }, 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="seeker-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
          <KpiCard title="Active Requests" value={counts.active} accent="primary" delay={0} />
          <KpiCard title="Fulfilled Requests" value={counts.completed} accent="success" delay={50} />
          <KpiCard title="Pending Matches" value={counts.pendingMatches} accent="accent" delay={100} />
          <KpiCard title="Urgent Requests" value={kpis.urgent} accent="danger" delay={150} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12, marginTop: 12 }}>
          <KpiCard title="Top Blood Type" value={topBlood} accent="default" />
          <KpiCard title="Donor Insights" value={`${insights.donors} donors / ${insights.avgScore}% avg`} accent="default" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
          <MonthlyTrend labels={trend.labels} data={trend.data} />
          <DemandByGroup data={pie} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
          <ActivityFeed items={activity} />
        </div>

        <Link to="/seeker/requests/create" className="fab" title="Create Request">＋</Link>
      </div>
    </SeekerLayout>
  );
}
