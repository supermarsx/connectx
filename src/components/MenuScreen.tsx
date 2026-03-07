import React from 'react';
import { useGameStore } from '../store/gameStore.ts';

export const MenuScreen: React.FC = () => {
  const setPhase = useGameStore(s => s.setPhase);

  return (
    <div className="menu-screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '32px',
      padding: '32px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '56px', fontWeight: 800, color: '#17171F',
          margin: 0, letterSpacing: '-1px',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span>
        </h1>
        <p style={{
          fontSize: '16px', color: '#9C9CB1', marginTop: '8px',
          fontWeight: 500,
        }}>
          Drop. Connect. Win.
        </p>
      </div>

      {/* Main menu cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        width: '100%', maxWidth: '320px',
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
                { id: 1, name: 'Player 1', type: 'human', color: '#FF6FAF' },
                { id: 2, name: 'Bot', type: 'bot', botDifficulty: 'medium', color: '#64E0C6' },
              ],
            });
            setPhase('lobby');
          }}
        />
        <MenuCard
          title="Quick Play"
          subtitle="Coming soon — Online matchmaking"
          color="#FFD36B"
          disabled
          onClick={() => {}}
        />
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

const MenuCard: React.FC<MenuCardProps> = ({ title, subtitle, color, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      padding: '20px 24px',
      borderRadius: '16px',
      border: '3px solid #17171F',
      backgroundColor: disabled ? '#F0EDF2' : '#fff',
      boxShadow: disabled ? 'none' : '5px 5px 0 #17171F',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      width: '100%',
      textAlign: 'left',
    }}
  >
    <span style={{
      fontSize: '20px', fontWeight: 700, color: disabled ? '#9C9CB1' : color,
    }}>
      {title}
    </span>
    <span style={{
      fontSize: '14px', color: '#9C9CB1', marginTop: '4px',
    }}>
      {subtitle}
    </span>
  </button>
);
