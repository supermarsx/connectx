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
        fontSize: '28px', fontWeight: 800, color: 'var(--color-neutral-900)',
        fontFamily: 'var(--font-display)', margin: 0,
      }}>
        Quick Play
      </h2>

      {!searching ? (
        /* Pre-queue preferences */
        <div style={{
          padding: '24px', borderRadius: '16px', border: '3px solid var(--color-neutral-900)',
          backgroundColor: 'var(--color-bg-card)', boxShadow: '5px 5px 0 var(--color-neutral-900)',
          width: '100%', maxWidth: '340px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase' }}>
              Mode
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {(['classic', 'fullboard'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '10px', borderRadius: '12px',
                  border: '2px solid var(--color-neutral-900)',
                  backgroundColor: mode === m ? '#64E0C6' : 'var(--color-neutral-50)',
                  color: mode === m ? '#fff' : 'var(--color-neutral-900)',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  boxShadow: mode === m ? '3px 3px 0 var(--color-neutral-900)' : 'none',
                }}>
                  {m === 'classic' ? 'Classic' : 'Full Board'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase' }}>
              Connect N
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {([4, 5, 6] as const).map(n => (
                <button key={n} onClick={() => setConnectN(n)} style={{
                  flex: 1, padding: '10px', borderRadius: '12px',
                  border: '2px solid var(--color-neutral-900)',
                  backgroundColor: connectN === n ? '#FFD36B' : 'var(--color-neutral-50)',
                  color: connectN === n ? '#fff' : 'var(--color-neutral-900)',
                  fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                  boxShadow: connectN === n ? '3px 3px 0 var(--color-neutral-900)' : 'none',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleJoin} style={{
            width: '100%', padding: '14px 24px', borderRadius: '14px',
            border: '2px solid var(--color-neutral-900)', backgroundColor: '#64E0C6',
            color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            boxShadow: '4px 4px 0 var(--color-neutral-900)',
          }}>
            Find Match
          </button>
        </div>
      ) : (
        /* Searching animation */
        <div style={{
          padding: '32px 28px', borderRadius: '16px', border: '3px solid var(--color-neutral-900)',
          backgroundColor: 'var(--color-bg-card)', boxShadow: '5px 5px 0 var(--color-neutral-900)',
          width: '100%', maxWidth: '340px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
        }}>
          <div
            role="progressbar"
            aria-label="Searching for match"
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '4px solid var(--color-cell-empty)', borderTopColor: '#64E0C6',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p role="status" aria-live="polite" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0 }}>
            Searching for players{dots}
          </p>
          {queuePosition > 0 && (
            <p style={{ fontSize: '14px', color: 'var(--color-neutral-400)', margin: 0 }}>
              Queue position: <strong style={{ color: '#64E0C6' }}>{queuePosition}</strong>
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-neutral-400)' }}>
            <span>{mode === 'classic' ? 'Classic' : 'Full Board'}</span>
            <span>·</span>
            <span>Connect {connectN}</span>
          </div>
        </div>
      )}

      <button onClick={searching ? () => { leaveQueue(); setHasJoined(false); } : () => useOnlineStore.getState().setOnlinePhase('menu')} style={{
        padding: '10px 24px', borderRadius: '12px',
        border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
        color: 'var(--color-neutral-400)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
      }}>
        {searching ? 'Cancel Search' : '← Back'}
      </button>

      {/* Spin keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
