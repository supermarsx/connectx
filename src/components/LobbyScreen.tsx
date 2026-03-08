import React from 'react';
import type { PlayerConfig, GameMode, BotDifficulty } from '../engine/types.ts';
import { PLAYER_COLORS } from '../engine/types.ts';
import { useGameStore } from '../store/gameStore.ts';

export const LobbyScreen: React.FC = () => {
  const config = useGameStore(s => s.config);
  const updateConfig = useGameStore(s => s.updateConfig);
  const startMatch = useGameStore(s => s.startMatch);
  const setPhase = useGameStore(s => s.setPhase);

  const handlePlayerCountChange = (count: number) => {
    const players: PlayerConfig[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      type: 'human' as const,
      color: PLAYER_COLORS[i],
    }));
    updateConfig({ players });
  };

  const toggleBot = (index: number) => {
    const newPlayers = [...config.players];
    const p = newPlayers[index];
    if (p.type === 'human') {
      newPlayers[index] = { ...p, type: 'bot', botDifficulty: 'medium', name: `Bot ${p.id}` };
    } else {
      newPlayers[index] = { ...p, type: 'human', botDifficulty: undefined, name: `Player ${p.id}` };
    }
    updateConfig({ players: newPlayers });
  };

  const setBotDifficulty = (index: number, diff: BotDifficulty) => {
    const newPlayers = [...config.players];
    newPlayers[index] = { ...newPlayers[index], botDifficulty: diff };
    updateConfig({ players: newPlayers });
  };

  return (
    <div className="lobby-screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '24px', padding: '32px', maxWidth: '480px', margin: '0 auto',
    }}>
      <h2 style={{ fontSize: '28px', color: '#17171F', margin: 0 }}>Game Setup</h2>

      {/* Board size */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Connect N</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => updateConfig({ board: { ...config.board, connectN: n } })}
              style={pillStyle(config.board.connectN === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Game mode */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Mode</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['classic', 'fullboard'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => updateConfig({ mode })}
              style={pillStyle(config.mode === mode)}
            >
              {mode === 'classic' ? 'Classic' : 'Full Board'}
            </button>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Rounds</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 3, 5].map(r => (
            <button
              key={r}
              onClick={() => updateConfig({ totalRounds: r })}
              style={pillStyle(config.totalRounds === r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Player count */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Players</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[2, 3, 4].map(c => (
            <button
              key={c}
              onClick={() => handlePlayerCountChange(c)}
              style={pillStyle(config.players.length === c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Player config */}
      {config.players.map((player, idx) => (
        <div key={player.id} className="setting-card" style={{
          ...cardStyle, borderLeft: `4px solid ${player.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#17171F' }}>{player.name}</span>
            <button onClick={() => toggleBot(idx)} style={pillStyle(false)}>
              {player.type === 'human' ? '👤 Human' : '🤖 Bot'}
            </button>
          </div>
          {player.type === 'bot' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setBotDifficulty(idx, d)}
                  style={pillStyle(player.botDifficulty === d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button onClick={() => setPhase('menu')} style={secondaryBtnStyle}>
          ← Back
        </button>
        <button onClick={startMatch} style={primaryBtnStyle}>
          Start Game
        </button>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px 20px',
  backgroundColor: '#fff',
  borderRadius: '16px',
  border: '2px solid #17171F',
  boxShadow: '4px 4px 0 #17171F',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 700,
  color: '#9C9CB1',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: '24px',
    border: '2px solid #17171F',
    backgroundColor: active ? '#FF6FAF' : '#FAF7FB',
    color: active ? '#fff' : '#17171F',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '14px 32px',
  borderRadius: '16px',
  border: '2px solid #17171F',
  backgroundColor: '#FF6FAF',
  color: '#fff',
  fontWeight: 700,
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '4px 4px 0 #17171F',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '14px 24px',
  borderRadius: '16px',
  border: '2px solid #17171F',
  backgroundColor: '#FAF7FB',
  color: '#17171F',
  fontWeight: 600,
  fontSize: '16px',
  cursor: 'pointer',
  boxShadow: '4px 4px 0 #17171F',
};
