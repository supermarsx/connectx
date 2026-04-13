import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useProfileStore } from '../store/profileStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { useOnlineStore } from '../store/onlineStore.ts';
import { PIECE_PATTERNS } from '../engine/types.ts';

const BUBBLES = [
  { size: 120, color: '#FF6FAF', left: '10%', bottom: '-10%', duration: 20, delay: 0, opacity: 0.15 },
  { size: 80,  color: '#64E0C6', left: '70%', bottom: '-15%', duration: 25, delay: 3, opacity: 0.12 },
  { size: 150, color: '#FFD36B', left: '30%', bottom: '-20%', duration: 28, delay: 5, opacity: 0.1 },
  { size: 60,  color: '#B388FF', left: '85%', bottom: '-5%',  duration: 18, delay: 2, opacity: 0.14 },
  { size: 100, color: '#FF6FAF', left: '50%', bottom: '-12%', duration: 22, delay: 8, opacity: 0.1 },
  { size: 90,  color: '#64E0C6', left: '15%', bottom: '-18%', duration: 30, delay: 6, opacity: 0.12 },
  { size: 70,  color: '#FFD36B', left: '60%', bottom: '-8%',  duration: 17, delay: 10, opacity: 0.13 },
  { size: 110, color: '#B388FF', left: '40%', bottom: '-22%', duration: 24, delay: 1, opacity: 0.11 },
];

const BubbleBackground: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      zIndex: 0, pointerEvents: 'none',
    }}
  >
    {BUBBLES.map((b, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: b.size,
          height: b.size,
          left: b.left,
          bottom: b.bottom,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${b.color}, transparent)`,
          opacity: b.opacity,
          animation: `bubble-float ${b.duration}s ease-in-out ${b.delay}s infinite`,
        }}
      />
    ))}
  </div>
);

export const MenuScreen: React.FC = () => {
  const setPhase = useGameStore(s => s.setPhase);
  const username = useProfileStore(s => s.username);
  const currentTitle = useProfileStore(s => s.currentTitle);
  const gamesPlayed = useProfileStore(s => s.gamesPlayed);
  const gamesWon = useProfileStore(s => s.gamesWon);
  const unlockedTitles = useProfileStore(s => s.unlockedTitles);
  const setUsername = useProfileStore(s => s.setUsername);
  const setTitle = useProfileStore(s => s.setTitle);

  const muted = useSettingsStore(s => s.muted);
  const toggleMute = useSettingsStore(s => s.toggleMute);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0';

  return (
    <div className="menu-screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '32px',
      padding: '32px', position: 'relative', overflow: 'hidden',
    }}>
      <BubbleBackground />

      {/* Sound toggle */}
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 1,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '22px', color: 'var(--color-neutral-400)', padding: '8px',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Logo */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <h1 style={{
          fontSize: '40px', fontWeight: 800, color: 'var(--color-neutral-900)',
          margin: 0, letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span>
        </h1>
        <p style={{
          fontSize: '16px', color: 'var(--color-neutral-400)', marginTop: '8px',
          fontWeight: 500,
        }}>
          Drop. Connect. Win.
        </p>
      </div>

      {/* Main menu cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        width: '100%', maxWidth: '320px', zIndex: 1,
      }}>
        <MenuCard
          title="Play Local"
          subtitle="Pass & play on one device"
          color="#FF6FAF"
          onClick={() => setPhase('lobby')}
        />
        <MenuCard
          title="vs Bot"
          subtitle="Challenge the AI"
          color="#64E0C6"
          onClick={() => {
            // Pre-configure for bot match and go to lobby
            const store = useGameStore.getState();
            store.updateConfig({
              players: [
                { id: 1, name: 'Player 1', type: 'human', color: '#FF6FAF', pattern: PIECE_PATTERNS[0], avatar: 'cat' },
                { id: 2, name: 'Bot', type: 'bot', botDifficulty: 'medium', color: '#64E0C6', pattern: PIECE_PATTERNS[1], avatar: 'fox' },
              ],
            });
            setPhase('lobby');
          }}
        />
        <MenuCard
          title="Play Online"
          subtitle="Multiplayer matchmaking & rooms"
          color="#FFD36B"
          onClick={() => {
            const online = useOnlineStore.getState();
            if (online.isAuthenticated) {
              online.setOnlinePhase('menu');
            } else {
              online.setOnlinePhase('auth');
            }
          }}
        />
        <MenuCard
          title="Leaderboards"
          subtitle="View your stats & records"
          color="#B388FF"
          onClick={() => setShowLeaderboard(prev => !prev)}
        />
        <MenuCard
          title="Settings"
          subtitle="Audio, accessibility & more"
          color="#9C9CB1"
          onClick={() => setPhase('settings')}
        />
      </div>

      {/* Inline leaderboard */}
      {showLeaderboard && (
        <div style={{
          width: '100%', maxWidth: '320px', padding: '20px 24px',
          backgroundColor: 'var(--color-bg-card)', borderRadius: '16px',
          border: '2px solid var(--color-neutral-900)', boxShadow: '4px 4px 0 var(--color-neutral-900)',
        }}>
          <h3 style={{
            fontSize: '18px', fontWeight: 700, color: '#B388FF',
            margin: '0 0 12px', fontFamily: 'var(--font-display)',
          }}>Your Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatRow label="Games Played" value={String(gamesPlayed)} />
            <StatRow label="Games Won" value={String(gamesWon)} />
            <StatRow label="Win Rate" value={`${winRate}%`} />
          </div>
        </div>
      )}

      {/* Profile card */}
      <div style={{
        width: '100%', maxWidth: '320px', padding: '16px 20px', zIndex: 1,
        backgroundColor: 'var(--color-bg-card)', borderRadius: '16px',
        border: '2px solid var(--color-neutral-900)', boxShadow: '4px 4px 0 var(--color-neutral-900)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            maxLength={20}
            style={{
              fontWeight: 700, fontSize: '18px', color: 'var(--color-neutral-900)',
              border: 'none', background: 'transparent', outline: 'none',
              borderBottom: '2px solid transparent', padding: '2px 0',
              transition: 'border-color 0.15s ease', width: '160px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#FF6FAF'; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
          />
          <span style={{
            padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
            fontWeight: 600, backgroundColor: '#FF6FAF', color: '#fff',
          }}>
            {currentTitle}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-neutral-400)', margin: '0 0 8px' }}>
          Games: {gamesPlayed} | Wins: {gamesWon}
        </p>
        {unlockedTitles.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {unlockedTitles.map(t => (
              <button
                key={t}
                onClick={() => setTitle(t)}
                style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                  border: t === currentTitle ? '2px solid var(--color-neutral-900)' : '1px solid #ccc',
                  backgroundColor: t === currentTitle ? '#FFD36B' : 'var(--color-neutral-50)',
                  color: 'var(--color-neutral-900)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface MenuCardProps {
  title: string;
  subtitle: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', backgroundColor: 'var(--color-neutral-50)', borderRadius: '10px',
    border: '1px solid var(--color-neutral-900)',
  }}>
    <span style={{ fontSize: '14px', color: 'var(--color-neutral-400)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '16px', color: 'var(--color-neutral-900)', fontWeight: 700 }}>{value}</span>
  </div>
);

const MenuCard: React.FC<MenuCardProps> = ({ title, subtitle, color, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      padding: '20px 24px',
      borderRadius: '16px',
      border: '3px solid var(--color-neutral-900)',
      backgroundColor: disabled ? '#F0EDF2' : 'var(--color-bg-card)',
      boxShadow: disabled ? 'none' : '5px 5px 0 var(--color-neutral-900)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      width: '100%',
      textAlign: 'left',
    }}
  >
    <span style={{
      fontSize: '20px', fontWeight: 700, color: disabled ? 'var(--color-neutral-400)' : color,
    }}>
      {title}
    </span>
    <span style={{
      fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '4px',
    }}>
      {subtitle}
    </span>
  </button>
);
