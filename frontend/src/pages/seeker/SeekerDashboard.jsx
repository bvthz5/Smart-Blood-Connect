import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SeekerLayout from "../../components/seeker/SeekerLayout";
import SeekerNavbar from "../../components/seeker/SeekerNavbar";
import SeekerSidebar from "../../components/seeker/SeekerSidebar";
import KpiCard from "../../components/seeker/KpiCard";
import { DemandByGroup, MonthlyTrend } from "../../components/seeker/Charts";
import ActivityFeed from "../../components/seeker/ActivityFeed";
import seekerService from "../../services/seekerService";
import "./SeekerDashboard.css";
import { redirectToLogin } from '../../utils/authRedirect';
  const onLogout = () => { localStorage.removeItem('seeker_token'); redirectToLogin(); };

export default function SeekerDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ urgent: 0, total: 0, matched: 0, lastWeek: 0 });
  const [pie, setPie] = useState([]);
  const [trend, setTrend] = useState({ labels: [], data: [] });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.dashboard();
        setKpis({
          urgent: data?.urgent_requests ?? 0,
          total: data?.total_requests ?? 0,
          matched: data?.confirmed_matches ?? 0,
          lastWeek: data?.requests_last_7d ?? 0
        });
        setPie(data?.demand_by_group || []);
        setTrend({ labels: data?.monthly?.labels || [], data: data?.monthly?.data || [] });
        setActivity(data?.activity || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const onLogout = () => { localStorage.removeItem('seeker_token'); window.location.href = '/seeker/login'; };

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
          <KpiCard title="Urgent Requests" value={kpis.urgent} accent="primary" delay={0} />
          <KpiCard title="Total Requests" value={kpis.total} accent="default" delay={50} />
          <KpiCard title="Confirmed Matches" value={kpis.matched} accent="accent" delay={100} />
          <KpiCard title="Requests (7d)" value={kpis.lastWeek} accent="default" delay={150} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
          <MonthlyTrend labels={trend.labels} data={trend.data} />
          <DemandByGroup data={pie} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
          <ActivityFeed items={activity} />
        </div>
      </div>
    </SeekerLayout>
  );
}
