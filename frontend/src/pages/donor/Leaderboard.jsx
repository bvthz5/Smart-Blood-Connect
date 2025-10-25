import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, MapPin, Droplets, TrendingUp, Users, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './leaderboard.css';

const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kerala');
  const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam');
  const [keralaLeaderboard, setKeralaLeaderboard] = useState([]);
  const [districtLeaderboard, setDistrictLeaderboard] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  useEffect(() => {
    if (activeTab === 'district') {
      loadDistrictLeaderboard(selectedDistrict);
    }
  }, [selectedDistrict, activeTab]);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const [keralaRes, topRes, statsRes] = await Promise.all([
        axios.get('/api/leaderboard/kerala?limit=100'),
        axios.get('/api/leaderboard/top-donors'),
        axios.get('/api/leaderboard/stats')
      ]);

      setKeralaLeaderboard(keralaRes.data.leaderboard || []);
      setTopDonors(topRes.data.top_donors || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistrictLeaderboard = async (district) => {
    try {
      const res = await axios.get(`/api/leaderboard/district/${district}?limit=50`);
      setDistrictLeaderboard(res.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load district leaderboard:', error);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="rank-icon gold" size={24} />;
    if (rank === 2) return <Medal className="rank-icon silver" size={24} />;
    if (rank === 3) return <Medal className="rank-icon bronze" size={24} />;
    return <span className="rank-number">#{rank}</span>;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading leaderboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      {/* Back Button */}
      <button className="back-button" onClick={() => navigate(-1)} title="Go back">
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <div className="header-icon">
            <Trophy size={48} />
          </div>
          <div className="header-text">
            <h1>Kerala Blood Donors Leaderboard</h1>
            <p>Celebrating our heroes who save lives through blood donation</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <Users className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">{stats.total_donors?.toLocaleString()}</div>
                <div className="stat-label">Active Donors</div>
              </div>
            </div>
            <div className="stat-card">
              <Droplets className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">{stats.total_donations?.toLocaleString()}</div>
                <div className="stat-label">Total Donations</div>
              </div>
            </div>
            <div className="stat-card">
              <MapPin className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">{stats.districts?.length || 14}</div>
                <div className="stat-label">Districts</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Podium */}
      {topDonors.length >= 3 && (
        <div className="podium-section">
          <h2 className="section-title">🏆 Top 3 Champions</h2>
          <div className="podium">
            {/* 2nd Place */}
            <div className="podium-item podium-2">
              <div className="podium-rank">
                <Medal className="silver" size={32} />
              </div>
              <div className="podium-avatar">
                <div className="avatar-circle silver">
                  {topDonors[1]?.name?.charAt(0) || '2'}
                </div>
              </div>
              <div className="podium-info">
                <h3>{topDonors[1]?.name}</h3>
                <div className="podium-badges">
                  {topDonors[1]?.badges?.map((badge, idx) => (
                    <span key={idx} className="badge-emoji" title={badge.name}>{badge.icon}</span>
                  ))}
                </div>
                <div className="podium-stats">
                  <span className="blood-group">{topDonors[1]?.blood_group}</span>
                  <span className="donations">{topDonors[1]?.total_donations} donations</span>
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="podium-item podium-1">
              <div className="podium-rank">
                <Trophy className="gold" size={40} />
              </div>
              <div className="podium-avatar">
                <div className="avatar-circle gold">
                  {topDonors[0]?.name?.charAt(0) || '1'}
                </div>
              </div>
              <div className="podium-info">
                <h3>{topDonors[0]?.name}</h3>
                <div className="podium-badges">
                  {topDonors[0]?.badges?.map((badge, idx) => (
                    <span key={idx} className="badge-emoji" title={badge.name}>{badge.icon}</span>
                  ))}
                </div>
                <div className="podium-stats">
                  <span className="blood-group">{topDonors[0]?.blood_group}</span>
                  <span className="donations">{topDonors[0]?.total_donations} donations</span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="podium-item podium-3">
              <div className="podium-rank">
                <Medal className="bronze" size={28} />
              </div>
              <div className="podium-avatar">
                <div className="avatar-circle bronze">
                  {topDonors[2]?.name?.charAt(0) || '3'}
                </div>
              </div>
              <div className="podium-info">
                <h3>{topDonors[2]?.name}</h3>
                <div className="podium-badges">
                  {topDonors[2]?.badges?.map((badge, idx) => (
                    <span key={idx} className="badge-emoji" title={badge.name}>{badge.icon}</span>
                  ))}
                </div>
                <div className="podium-stats">
                  <span className="blood-group">{topDonors[2]?.blood_group}</span>
                  <span className="donations">{topDonors[2]?.total_donations} donations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="leaderboard-tabs">
        <button
          className={`tab-button ${activeTab === 'kerala' ? 'active' : ''}`}
          onClick={() => setActiveTab('kerala')}
        >
          <Star size={18} />
          Kerala State
        </button>
        <button
          className={`tab-button ${activeTab === 'district' ? 'active' : ''}`}
          onClick={() => setActiveTab('district')}
        >
          <MapPin size={18} />
          District Wise
        </button>
      </div>

      {/* District Selector */}
      {activeTab === 'district' && (
        <div className="district-selector">
          <label>Select District:</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="district-dropdown"
          >
            {KERALA_DISTRICTS.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Donor</th>
              <th>Blood Group</th>
              <th>Location</th>
              <th>Badges</th>
              <th>Donations</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'kerala' ? keralaLeaderboard : districtLeaderboard).map((donor) => (
              <tr key={donor.donor_id} className={getRankClass(donor.rank)}>
                <td className="rank-cell">
                  {getRankIcon(donor.rank)}
                </td>
                <td className="donor-cell">
                  <div className="donor-info">
                    <div className="donor-avatar">
                      {donor.name.charAt(0)}
                    </div>
                    <span className="donor-name">{donor.name}</span>
                  </div>
                </td>
                <td>
                  <span className="blood-badge">{donor.blood_group}</span>
                </td>
                <td className="location-cell">
                  <MapPin size={14} />
                  {donor.city && donor.district ? `${donor.city}, ${donor.district}` : donor.district || donor.city || '-'}
                </td>
                <td className="badges-cell">
                  <div className="badge-list">
                    {donor.badges?.map((badge, idx) => (
                      <span key={idx} className="badge-icon" title={badge.name}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="donations-cell">
                  <span className="donation-count">{donor.total_donations}</span>
                </td>
                <td className="score-cell">
                  <span className="badge-score">{donor.badge_score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

