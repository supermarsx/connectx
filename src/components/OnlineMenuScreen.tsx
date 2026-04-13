import React, { useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { api } from '../services/api.ts';

interface LeaderboardEntry {
  userId: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  rank: number;
}

const menuCardStyle = (color: string): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  padding: '20px 24px', borderRadius: '16px',
  border: '3px solid var(--color-neutral-900)', backgroundColor: 'var(--color-bg-card)',
  boxShadow: '5px 5px 0 var(--color-neutral-900)', cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  width: '100%', textAlign: 'left',
  borderLeft: `4px solid ${color}`,
});

export const OnlineMenuScreen: React.FC = () => {
  const user = useOnlineStore(s => s.user);
  const setOnlinePhase = useOnlineStore(s => s.setOnlinePhase);
  const logout = useOnlineStore(s => s.logout);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const handleBackToLocal = () => {
    sessionStorage.removeItem('connectx-online-flow');
    sessionStorage.removeItem('connectx-online-phase');
    useOnlineStore.setState({ isOnlineFlow: false, onlinePhase: 'auth' });
  };

  const handleToggleLeaderboard = async () => {
    if (showLeaderboard) {
      setShowLeaderboard(false);
      return;
    }
    setLoadingLeaderboard(true);
    try {
      const data = await api.getLeaderboard(1, 10);
      setLeaderboard(data.entries);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
      setShowLeaderboard(true);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '28px', padding: '32px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '36px', fontWeight: 800, color: 'var(--color-neutral-900)', margin: 0,
          letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span>
        </h1>
        {user && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0 }}>
              Hello, {user.username}!
            </p>
            <span style={{
              display: 'inline-block', padding: '3px 14px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 700, backgroundColor: '#FFD36B',
              color: 'var(--color-neutral-900)', marginTop: '6px',
            }}>
              ⭐ {user.rating} ELO
            </span>
          </div>
        )}
      </div>

      {/* Menu options */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        width: '100%', maxWidth: '320px',
      }}>
        <button onClick={() => setOnlinePhase('quickplay-queue')} style={menuCardStyle('#64E0C6')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#64E0C6' }}>Quick Play</span>
          <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
            Find a match instantly
          </span>
        </button>

        <button onClick={() => setOnlinePhase('room-browser')} style={menuCardStyle('#FF6FAF')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#FF6FAF' }}>Custom Room</span>
          <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
            Create or join a private room
          </span>
        </button>

        <button onClick={handleBackToLocal} style={menuCardStyle('#B388FF')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#B388FF' }}>Local Play</span>
          <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
            Back to local multiplayer
          </span>
        </button>

        <button onClick={handleToggleLeaderboard} style={menuCardStyle('#FFD36B')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#E5A800' }}>
            {showLeaderboard ? 'Hide Leaderboard' : 'Leaderboard'}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
            Top players ranked by ELO
          </span>
        </button>

        <button onClick={() => setOnlinePhase('friends')} style={menuCardStyle('#64E0C6')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#2BA88E' }}>Friends</span>
          <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
            Manage your friends list
          </span>
        </button>
      </div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div style={{
          width: '100%', maxWidth: '380px', borderRadius: '16px',
          border: '3px solid var(--color-neutral-900)', backgroundColor: 'var(--color-bg-card)',
          boxShadow: '5px 5px 0 var(--color-neutral-900)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px', backgroundColor: '#FFD36B',
            borderBottom: '3px solid var(--color-neutral-900)',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-neutral-900)' }}>
              🏆 Top 10 Players
            </h2>
          </div>
          {loadingLeaderboard ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
              Loading...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
              No leaderboard data yet
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {leaderboard.map((entry) => (
                <div key={entry.userId} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 20px',
                  backgroundColor: user?.id === entry.userId ? '#E8DEFF' : 'transparent',
                }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '13px', color: 'var(--color-neutral-900)',
                    backgroundColor: entry.rank === 1 ? '#FFD36B'
                      : entry.rank === 2 ? '#C0C0C0'
                      : entry.rank === 3 ? '#CD7F32'
                      : '#E8E0F0',
                    border: '2px solid var(--color-neutral-900)', flexShrink: 0,
                  }}>
                    {entry.rank}
                  </span>
                  <span style={{
                    flex: 1, fontWeight: 700, fontSize: '15px', color: 'var(--color-neutral-900)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {entry.username}
                  </span>
                  <span style={{
                    fontWeight: 700, fontSize: '14px', color: '#E5A800',
                  }}>
                    {entry.rating}
                  </span>
                  <span style={{
                    fontSize: '12px', color: 'var(--color-neutral-400)', fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    {entry.wins}W {entry.losses}L
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User info footer */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px', borderRadius: '16px',
          backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-neutral-900)',
          boxShadow: '3px 3px 0 var(--color-neutral-900)',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--color-neutral-400)' }}>
            W:{user.wins} L:{user.losses} D:{user.draws}
          </span>
          <button onClick={logout} style={{
            padding: '6px 14px', borderRadius: '10px',
            border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
            color: 'var(--color-neutral-400)', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
          }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
