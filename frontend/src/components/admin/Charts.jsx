import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend } from 'chart.js';
import './Charts.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend);

export const TrendsChart = ({ labels = [], data = [] }) => {
  const ds = {
    labels,
    datasets: [{
      label: 'Requests',
      data,
      fill: false,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.15)',
      tension: 0.35
    }]
  };
  const options = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  return <div className="chart-card"><Line data={ds} options={options} /></div>;
};

export const BloodGroupDonut = ({ labels = [], data = [] }) => {
  const ds = {
    labels,
    datasets: [{
      data,
      backgroundColor: ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'],
      borderWidth: 0
    }]
  };
  const options = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  return <div className="chart-card"><Doughnut data={ds} options={options} /></div>;
};

export default function Charts() { return null; }
