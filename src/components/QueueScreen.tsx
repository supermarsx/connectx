import React, { useEffect, useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';

export const QueueScreen: React.FC = () => {
  const queuePosition = useOnlineStore(s => s.queuePosition);
  const leaveQueue = useOnlineStore(s => s.leaveQueue);
  const joinQuickPlay = useOnlineStore(s => s.joinQuickPlay);
  const isInQueue = useOnlineStore(s => s.isInQueue);

  const [mode, setMode] = useState<'classic' | 'fullboard'>('classic');
  const [connectN, setConnectN] = useState<4 | 5 | 6>(4);
  const [dots, setDots] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = () => {
    joinQuickPlay(mode, connectN, true);
    setHasJoined(true);
  };

  const searching = isInQueue || hasJoined;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '32px',
    }}>
      <h2 style={{
        fontSize: '28px', fontWeight: 800, color: '#17171F',
        fontFamily: 'var(--font-display)', margin: 0,
      }}>
        Quick Play
      </h2>

      {!searching ? (
        /* Pre-queue preferences */
        <div style={{
          padding: '24px', borderRadius: '16px', border: '3px solid #17171F',
          backgroundColor: '#F3ECFF', boxShadow: '5px 5px 0 #17171F',
          width: '100%', maxWidth: '340px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>
              Mode
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {(['classic', 'fullboard'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '10px', borderRadius: '12px',
                  border: '2px solid #17171F',
                  backgroundColor: mode === m ? '#64E0C6' : '#FAF7FB',
                  color: mode === m ? '#fff' : '#17171F',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  boxShadow: mode === m ? '3px 3px 0 #17171F' : 'none',
                }}>
                  {m === 'classic' ? 'Classic' : 'Full Board'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>
              Connect N
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {([4, 5, 6] as const).map(n => (
                <button key={n} onClick={() => setConnectN(n)} style={{
                  flex: 1, padding: '10px', borderRadius: '12px',
                  border: '2px solid #17171F',
                  backgroundColor: connectN === n ? '#FFD36B' : '#FAF7FB',
                  color: connectN === n ? '#fff' : '#17171F',
                  fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                  boxShadow: connectN === n ? '3px 3px 0 #17171F' : 'none',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleJoin} style={{
            width: '100%', padding: '14px 24px', borderRadius: '14px',
            border: '2px solid #17171F', backgroundColor: '#64E0C6',
            color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            boxShadow: '4px 4px 0 #17171F',
          }}>
            Find Match
          </button>
        </div>
      ) : (
        /* Searching animation */
        <div style={{
          padding: '32px 28px', borderRadius: '16px', border: '3px solid #17171F',
          backgroundColor: '#F3ECFF', boxShadow: '5px 5px 0 #17171F',
          width: '100%', maxWidth: '340px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '4px solid #E0D6E6', borderTopColor: '#64E0C6',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#17171F', margin: 0 }}>
            Searching for players{dots}
          </p>
          {queuePosition > 0 && (
            <p style={{ fontSize: '14px', color: '#9C9CB1', margin: 0 }}>
              Queue position: <strong style={{ color: '#64E0C6' }}>{queuePosition}</strong>
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#9C9CB1' }}>
            <span>{mode === 'classic' ? 'Classic' : 'Full Board'}</span>
            <span>·</span>
            <span>Connect {connectN}</span>
          </div>
        </div>
      )}

      <button onClick={searching ? leaveQueue : () => useOnlineStore.getState().setOnlinePhase('menu')} style={{
        padding: '10px 24px', borderRadius: '12px',
        border: '2px solid #17171F', backgroundColor: '#FAF7FB',
        color: '#9C9CB1', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
      }}>
        {searching ? 'Cancel Search' : '← Back'}
      </button>

      {/* Spin keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
