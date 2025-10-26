import React, { useState, useEffect } from 'react';
import { Trophy, Medal, MapPin, Droplets, Users, Star, ArrowLeft, ShieldCheck, Zap, Heart, Crown, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './leaderboard.css';

const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
];

// --- Custom function to calculate score ---
// Score = (donations * 10) + (badges * 5)
const calculateScore = (donor) => {
  const donationScore = (donor.total_donations || 0) * 10;
  const badgeScore = (donor.badges?.length || 0) * 5;
  return donationScore + badgeScore;
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kerala');
  const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam');
  const [keralaLeaderboard, setKeralaLeaderboard] = useState([]);
  const [districtLeaderboard, setDistrictLeaderboard] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  // --- Helper to process and sort data with calculated scores ---
  const processLeaderboardData = (data) => {
    if (!data) return [];
    return data.map(donor => ({
      ...donor,
      calculated_score: calculateScore(donor)
    })).sort((a, b) => b.calculated_score - a.calculated_score)
       .map((donor, index) => ({ ...donor, rank: index + 1 }));
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load leaderboard data first (required)
        const [keralaRes, topRes, statsRes] = await Promise.all([
          api.get('/api/leaderboard/kerala?limit=100'),
          api.get('/api/leaderboard/top-donors'),
          api.get('/api/leaderboard/stats')
        ]);

        const processedKeralaData = processLeaderboardData(keralaRes.data.leaderboard);
        const processedTopDonors = processLeaderboardData(topRes.data.top_donors).slice(0, 3);

        setKeralaLeaderboard(processedKeralaData);
        setTopDonors(processedTopDonors);
        setStats(statsRes.data);

        // Try to get current user's rank (optional - don't block if fails)
        try {
          const userRes = await api.get('/api/donors/me');
          if (userRes && userRes.data) {
            const userData = userRes.data;
            const userFullName = `${userData.first_name} ${userData.last_name || ''}`.trim();
            const userRankData = processedKeralaData.find(d => d.name === userFullName);
            if (userRankData) {
              setCurrentUserData(userRankData);
              setCurrentUserRank(userRankData.rank);
            }
          }
        } catch (userError) {
          console.warn('Could not fetch user rank:', userError.message);
          // Continue without user rank - table will still display
        }

        // Pre-load the default district leaderboard
        loadDistrictLeaderboard(selectedDistrict, false);
      } catch (error) {
        console.error('Failed to load leaderboards:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'district') {
      loadDistrictLeaderboard(selectedDistrict, true);
    }
  }, [selectedDistrict, activeTab]);

  const loadDistrictLeaderboard = async (district, showLoading) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get(`/api/leaderboard/district/${district}?limit=50`);
      setDistrictLeaderboard(processLeaderboardData(res.data.leaderboard));
    } catch (error) {
      console.error('Failed to load district leaderboard:', error);
    } finally {
        if (showLoading) setLoading(false);
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

  const PodiumCard = ({ donor, rank }) => {
    if (!donor) return null;

    const rankClasses = {
        1: 'gold',
        2: 'silver',
        3: 'bronze'
    };
    const rankIcons = {
        1: <Trophy size={32} />,
        2: <Medal size={28} />,
        3: <Medal size={24} />
    };

    return (
        <div className={`podium-card rank-${rank}`}>
            <div className={`podium-rank-icon ${rankClasses[rank]}`}>{rankIcons[rank]}</div>
            <div className="podium-avatar">
                {donor.name?.charAt(0) || '?'}
            </div>
            <h3 className="podium-name">{donor.name}</h3>
            <p className="podium-location">{donor.district || 'Kerala'}</p>
            <div className="podium-stats">
                <div className="stat-item">
                    <Heart size={16} /> {donor.total_donations} Donations
                </div>
                <div className="stat-item">
                    <Star size={16} /> {donor.calculated_score} Score
                </div>
            </div>
             <div className="podium-badges">
                {donor.badges?.map((badge, idx) => (
                  <span key={idx} className="badge-emoji" title={badge.name}>{badge.icon}</span>
                ))}
            </div>
        </div>
    );
  };


  if (loading && !keralaLeaderboard.length) { // Show full-page loader only on initial load
    return (
      <div className="leaderboard-page loading-container">
        <div className="spinner"></div>
        <p>Loading Legendary Donors...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-content">
        <button className="back-button" onClick={() => navigate(-1)} title="Go back">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <header className="leaderboard-header">
          <div className="header-icon-wrapper">
            <Trophy size={48} />
          </div>
          <h1>Kerala Blood Donors Leaderboard</h1>
          <p>Celebrating the heroes who save lives, one donation at a time.</p>
        </header>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card"><Users /><div><span>{stats.total_donors?.toLocaleString()}</span><span>Active Donors</span></div></div>
            <div className="stat-card"><Droplets /><div><span>{stats.total_donations?.toLocaleString()}</span><span>Total Donations</span></div></div>
            <div className="stat-card"><MapPin /><div><span>{stats.districts?.length || 14}</span><span>Districts Covered</span></div></div>
          </div>
        )}

        {topDonors.length >= 3 && (
          <section className="podium-section">
            <h2 className="section-title">🏆 Top 3 Champions</h2>
            <div className="podium-container">
              <PodiumCard donor={topDonors[1]} rank={2} />
              <PodiumCard donor={topDonors[0]} rank={1} />
              <PodiumCard donor={topDonors[2]} rank={3} />
            </div>
          </section>
        )}

        <div className="leaderboard-tabs">
          <button className={`tab-button ${activeTab === 'kerala' ? 'active' : ''}`} onClick={() => setActiveTab('kerala')}>
            <Star size={18} /> Kerala State
          </button>
          <button className={`tab-button ${activeTab === 'district' ? 'active' : ''}`} onClick={() => setActiveTab('district')}>
            <MapPin size={18} /> District Wise
          </button>
        </div>

        {activeTab === 'district' && (
          <div className="district-selector">
            <label htmlFor="district-dropdown">Select District:</label>
            <select id="district-dropdown" value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
              {KERALA_DISTRICTS.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="leaderboard-table-container">
          <div className="table-header-section">
            <h2 className="table-title">🔥 Top 10 Donors</h2>
            <p className="table-subtitle">The most generous blood donors in Kerala</p>
          </div>
          {loading && <div className="table-loader"><div className="spinner"></div></div>}
         <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="th-center">Rank</th>
                <th className="th-left">Donor</th>
                <th className="th-left">Location</th>
                <th className="th-center">Donations</th>
                <th className="th-center">Badges</th>
                <th className="th-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'kerala' ? keralaLeaderboard : districtLeaderboard).slice(0, 10).map((donor, index) => (
                <tr key={donor.donor_id} className={`${getRankClass(donor.rank)} table-row-anim`} style={{animationDelay: `${index * 0.05}s`}}>

                  {/* Cell 1: Rank (Always renders) */}
                  <td data-label="Rank" className="rank-cell td-center">{getRankIcon(donor.rank)}</td>

                  {/* Cell 2: Donor (Always renders, handles internal nulls) */}
                  <td data-label="Donor" className="donor-cell td-left">
                    <div className="donor-avatar">{(donor.name || '?').charAt(0)}</div>
                    <div className='donor-details'>
                      <span className="donor-name">{donor.name || 'Unknown Donor'}</span>
                      <span className="blood-group">{donor.blood_group || 'N/A'}</span>
                    </div>
                  </td>

                  {/* Cell 3: Location (Always renders, handles internal nulls) */}
                  <td data-label="Location" className="location-cell td-left">
                    {donor.district ? (
                        <><MapPin size={14} /> {donor.district}</>
                    ) : (
                        <span className="null-value">–</span>
                    )}
                  </td>

                  {/* Cell 4: Donations (Always renders, handles internal nulls) */}
                  <td data-label="Donations" className="donations-cell td-center">
                    <span className="count-badge green">{donor.total_donations || 0}</span>
                  </td>

                  {/* Cell 5: Badges (Always renders, handles internal nulls) */}
                  <td data-label="Badges" className="badges-cell td-center">
                    <div className="badge-list">
                      {donor.badges?.length > 0 ? donor.badges.map((badge, idx) => (
                        <span key={idx} className="badge-icon" title={badge.name}>{badge.icon}</span>
                      )) : <span className="null-value">–</span>}
                    </div>
                  </td>

                  {/* Cell 6: Score (Always renders, handles internal nulls) */}
                  <td data-label="Score" className="score-cell td-center">
                    <span className="count-badge purple">{donor.calculated_score || 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User's Rank Section */}
        {currentUserData && currentUserRank && (
          <div className="user-rank-section">
            <div className="user-rank-card">
              <div className="rank-badge-wrapper">
                <div className="rank-badge-circle">
                  <span className="rank-number-large">#{currentUserRank}</span>
                </div>
              </div>
              <div className="user-rank-info">
                <h3 className="user-rank-title">Your Rank</h3>
                <p className="user-rank-name">{currentUserData.name}</p>
                <div className="user-rank-stats">
                  <div className="stat-item">
                    <Heart size={16} />
                    <span>{currentUserData.total_donations} Donations</span>
                  </div>
                  <div className="stat-item">
                    <Star size={16} />
                    <span>{currentUserData.calculated_score} Score</span>
                  </div>
                </div>
              </div>
              <div className="rank-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{width: `${(currentUserRank / 100) * 100}%`}}></div>
                </div>
                <span className="progress-text">{currentUserRank > 50 ? 'Keep Donating!' : 'You\'re in Top 50!'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}