import React, { useMemo } from 'react';
import './Charts.css';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

export const DemandByGroup = ({ data = [] }) => {
  const chartData = useMemo(() => {
    const labels = (data || []).map(d => d.group || d.blood_group || d.label);
    const values = (data || []).map(d => Number(d.count ?? d.value ?? d.demand ?? d.total ?? 0));
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#C62828','#E53935','#F44336','#EF9A9A','#FFCDD2','#1976D2','#64B5F6','#90CAF9'],
        borderWidth: 0,
      }]
    };
  }, [data]);
  const options = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false };
  return (
    <div className="chart-card" style={{ alignItems: 'stretch', justifyContent: 'stretch' }}>
      <div style={{ width: '100%', height: 260 }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export const MonthlyTrend = ({ labels = [], data = [] }) => {
  const chartData = useMemo(() => ({
    labels: labels || [],
    datasets: [{
      label: 'Requests',
      data: data || [],
      fill: false,
      borderColor: '#1976D2',
      backgroundColor: 'rgba(25,118,210,0.25)',
      tension: 0.3,
    }]
  }), [labels, data]);
  const options = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } };
  return (
    <div className="chart-card" style={{ alignItems: 'stretch', justifyContent: 'stretch' }}>
      <div style={{ width: '100%', height: 260 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default function Charts() { return null; }
