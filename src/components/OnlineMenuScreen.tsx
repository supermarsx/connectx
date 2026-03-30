import React from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';

const menuCardStyle = (_color: string): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  padding: '20px 24px', borderRadius: '16px',
  border: '3px solid #17171F', backgroundColor: '#F3ECFF',
  boxShadow: '5px 5px 0 #17171F', cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  width: '100%', textAlign: 'left',
});

export const OnlineMenuScreen: React.FC = () => {
  const user = useOnlineStore(s => s.user);
  const setOnlinePhase = useOnlineStore(s => s.setOnlinePhase);
  const logout = useOnlineStore(s => s.logout);

  const handleBackToLocal = () => {
    useOnlineStore.setState({ isOnlineFlow: false, onlinePhase: 'auth' });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '28px', padding: '32px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '36px', fontWeight: 800, color: '#17171F', margin: 0,
          letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span>
        </h1>
        {user && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#17171F', margin: 0 }}>
              Hello, {user.username}!
            </p>
            <span style={{
              display: 'inline-block', padding: '3px 14px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 700, backgroundColor: '#FFD36B',
              color: '#17171F', marginTop: '6px',
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
          <span style={{ fontSize: '14px', color: '#9C9CB1', marginTop: '4px' }}>
            Find a match instantly
          </span>
        </button>

        <button onClick={() => setOnlinePhase('room-browser')} style={menuCardStyle('#FF6FAF')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#FF6FAF' }}>Custom Room</span>
          <span style={{ fontSize: '14px', color: '#9C9CB1', marginTop: '4px' }}>
            Create or join a private room
          </span>
        </button>

        <button onClick={handleBackToLocal} style={menuCardStyle('#B388FF')}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#B388FF' }}>Local Play</span>
          <span style={{ fontSize: '14px', color: '#9C9CB1', marginTop: '4px' }}>
            Back to local multiplayer
          </span>
        </button>
      </div>

      {/* User info footer */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px', borderRadius: '16px',
          backgroundColor: '#F3ECFF', border: '2px solid #17171F',
          boxShadow: '3px 3px 0 #17171F',
        }}>
          <span style={{ fontSize: '13px', color: '#9C9CB1' }}>
            W:{user.wins} L:{user.losses} D:{user.draws}
          </span>
          <button onClick={logout} style={{
            padding: '6px 14px', borderRadius: '10px',
            border: '2px solid #17171F', backgroundColor: '#FAF7FB',
            color: '#9C9CB1', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
          }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
