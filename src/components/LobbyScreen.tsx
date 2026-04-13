import React from 'react';
import type { PlayerConfig, GameMode, BotDifficulty, PlayerAvatar } from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, PIECE_COLOR_PALETTE, PLAYER_AVATARS, DEFAULT_AVATARS, HIGH_CONTRAST_COLORS, BOARD_SIZE_PRESETS } from '../engine/types.ts';
import { useGameStore } from '../store/gameStore.ts';
import { useProfileStore } from '../store/profileStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { AvatarIcon } from './AvatarIcon.tsx';
import { darkenColor } from '../utils/color.ts';

const BoardPreview: React.FC<{
  rows: number;
  cols: number;
  connectN: number;
  mode: GameMode;
  players: PlayerConfig[];
}> = ({ rows, cols, connectN, mode, players }) => {
  const bgColor = mode === 'classic' ? '#E8DEF8' : '#2D1B4E';
  const cellSize = 14;
  const gap = 3;

  const previewPieces = React.useMemo(() => {
    const pieces: Record<string, string> = {};
    const numPlayers = players.length;
    players.forEach((p, pi) => {
      const baseCol = ((pi * 2 + 1) * connectN) % cols;
      for (let k = 0; k < Math.min(connectN - 1, 3); k++) {
        const r = rows - 1 - k;
        const c = (baseCol + ((k * (pi + 1) * 3) % (cols - 1))) % cols;
        if (!pieces[`${r},${c}`]) {
          pieces[`${r},${c}`] = p.color;
        }
      }
      const extraR = rows - 1;
      const extraC = (baseCol + numPlayers + pi) % cols;
      if (!pieces[`${extraR},${extraC}`]) {
        pieces[`${extraR},${extraC}`] = p.color;
      }
    });
    return pieces;
  }, [rows, cols, connectN, players]);

  return (
    <div style={{
      ...cardStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      maxWidth: '220px',
      padding: '12px 16px',
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral-400)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {rows} × {cols}
      </span>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gap: `${gap}px`,
        backgroundColor: bgColor,
        padding: '6px',
        borderRadius: '8px',
        border: '2px solid var(--color-neutral-900)',
      }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const playerColor = previewPieces[`${r},${c}`];
          return (
            <div
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: '50%',
                background: playerColor
                  ? `radial-gradient(circle at 35% 35%, ${playerColor}ee, ${playerColor})`
                  : 'radial-gradient(circle at 35% 35%, #f0eef5, #ddd8e8)',
                border: playerColor ? `1.5px solid ${darkenColor(playerColor, 0.25)}` : '1px solid #c8c0d8',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};


export const LobbyScreen: React.FC = () => {
  const config = useGameStore(s => s.config);
  const updateConfig = useGameStore(s => s.updateConfig);
  const startMatch = useGameStore(s => s.startMatch);
  const setPhase = useGameStore(s => s.setPhase);
  const setProfileUsername = useProfileStore(s => s.setUsername);
  const highContrast = useSettingsStore(s => s.highContrast);
  const toggleHighContrast = useSettingsStore(s => s.toggleHighContrast);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const toggleReduceMotion = useSettingsStore(s => s.toggleReduceMotion);
  const textSize = useSettingsStore(s => s.textSize);
  const increaseTextSize = useSettingsStore(s => s.increaseTextSize);
  const decreaseTextSize = useSettingsStore(s => s.decreaseTextSize);

  // Board size selection state
  const [boardSizeKey, setBoardSizeKey] = React.useState(() => {
    const found = BOARD_SIZE_PRESETS.find(p =>
      p.rows === config.board.rows && p.cols === config.board.cols && p.connectN === config.board.connectN
    );
    return found ? found.key : 'custom';
  });
  const [customRows, setCustomRows] = React.useState(config.board.rows);
  const [customCols, setCustomCols] = React.useState(config.board.cols);
  const [customConnectN, setCustomConnectN] = React.useState(config.board.connectN);

  const handleBoardSizePreset = (key: string) => {
    setBoardSizeKey(key);
    const preset = BOARD_SIZE_PRESETS.find(p => p.key === key);
    if (preset && key !== 'custom') {
      updateConfig({ board: { rows: preset.rows, cols: preset.cols, connectN: preset.connectN } });
      setCustomRows(preset.rows);
      setCustomCols(preset.cols);
      setCustomConnectN(preset.connectN);
    }
  };
  const handleCustomChange = (field: 'rows' | 'cols' | 'connectN', value: number) => {
    let rows = customRows, cols = customCols, connectN = customConnectN;
    if (field === 'rows') rows = value;
    if (field === 'cols') cols = value;
    if (field === 'connectN') connectN = value;
    connectN = Math.min(connectN, Math.max(rows, cols));
    setCustomRows(rows);
    setCustomCols(cols);
    setCustomConnectN(connectN);
    setBoardSizeKey('custom');
    updateConfig({ board: { rows, cols, connectN } });
  };

  const handleToggleHighContrast = () => {
    toggleHighContrast();
    const nextPalette = highContrast ? PLAYER_COLORS : HIGH_CONTRAST_COLORS;
    const newPlayers = config.players.map((p, i) => ({
      ...p,
      color: nextPalette[i],
    }));
    updateConfig({ players: newPlayers });
  };

  const setPlayerName = (index: number, name: string) => {
    const newPlayers = [...config.players];
    const sanitized = name.replace(/[<>&"']/g, '').trim().slice(0, 20);
    newPlayers[index] = { ...newPlayers[index], name: sanitized };
    updateConfig({ players: newPlayers });
    if (index === 0) {
      setProfileUsername(sanitized);
    }
  };

  const handlePlayerCountChange = (count: number) => {
    const usedColors = config.players.map(p => p.color);
    const players: PlayerConfig[] = Array.from({ length: count }, (_, i) => {
      if (i < config.players.length) {
        return config.players[i];
      }
      const available = PIECE_COLOR_PALETTE.find(c => !usedColors.includes(c));
      const color = available ?? PLAYER_COLORS[i] ?? PIECE_COLOR_PALETTE[i];
      usedColors.push(color);
      return {
        id: i + 1,
        name: `Player ${i + 1}`,
        type: 'human' as const,
        color,
        outlineColor: PLAYER_OUTLINE_COLORS[i] ?? darkenColor(color, 0.25),
        pattern: PIECE_PATTERNS[i],
        avatar: DEFAULT_AVATARS[i],
      };
    });
    updateConfig({ players });
  };

  const setPlayerAvatar = (index: number, avatar: PlayerAvatar) => {
    const newPlayers = [...config.players];
    newPlayers[index] = { ...newPlayers[index], avatar };
    updateConfig({ players: newPlayers });
  };

  const setPlayerColor = (index: number, newColor: string) => {
    const newPlayers = [...config.players];
    const conflictIdx = newPlayers.findIndex((p, i) => i !== index && p.color === newColor);
    if (conflictIdx !== -1) {
      newPlayers[conflictIdx] = { ...newPlayers[conflictIdx], color: newPlayers[index].color, outlineColor: newPlayers[index].outlineColor };
    }
    newPlayers[index] = { ...newPlayers[index], color: newColor, outlineColor: darkenColor(newColor, 0.25) };
    updateConfig({ players: newPlayers });
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
      <h2 style={{ fontSize: '24px', color: 'var(--color-neutral-900)', margin: 0 }}>Game Setup</h2>

      <BoardPreview
        rows={config.board.rows}
        cols={config.board.cols}
        connectN={config.board.connectN}
        mode={config.mode}
        players={config.players}
      />

      {/* Board size */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Board Size</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {BOARD_SIZE_PRESETS.filter(p => p.key !== 'custom').map(preset => (
            <button
              key={preset.key}
              onClick={() => handleBoardSizePreset(preset.key)}
              style={pillStyle(boardSizeKey === preset.key)}
            >
              {preset.label}
            </button>
          ))}
          <button
            key="custom"
            onClick={() => handleBoardSizePreset('custom')}
            style={pillStyle(boardSizeKey === 'custom')}
          >
            Custom
          </button>
        </div>
        {boardSizeKey === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Rows
              <input
                type="number"
                min={4}
                max={20}
                value={customRows}
                onChange={e => handleCustomChange('rows', Math.max(4, Math.min(20, Number(e.target.value))))}
                style={{ width: 48, marginLeft: 4, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: '2px 6px' }}
              />
            </label>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Cols
              <input
                type="number"
                min={4}
                max={20}
                value={customCols}
                onChange={e => handleCustomChange('cols', Math.max(4, Math.min(20, Number(e.target.value))))}
                style={{ width: 48, marginLeft: 4, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: '2px 6px' }}
              />
            </label>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Connect
              <input
                type="number"
                min={3}
                max={Math.max(customRows, customCols)}
                value={customConnectN}
                onChange={e => handleCustomChange('connectN', Math.max(3, Math.min(Math.max(customRows, customCols), Number(e.target.value))))}
                style={{ width: 48, marginLeft: 4, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: '2px 6px' }}
              />
            </label>
          </div>
        )}
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[1, 3, 5].map(r => (
            <button
              key={r}
              onClick={() => updateConfig({ totalRounds: r, matchWinCondition: 'fixed-rounds' })}
              style={pillStyle(config.totalRounds === r && config.matchWinCondition === 'fixed-rounds')}
            >
              {r}
            </button>
          ))}
          <button
            key="custom-rounds"
            onClick={() => updateConfig({ matchWinCondition: 'fixed-rounds' })}
            style={pillStyle(config.matchWinCondition === 'fixed-rounds' && ![1,3,5].includes(config.totalRounds))}
          >
            Custom
          </button>
          {config.mode === 'fullboard' && (
            <button
              key="up-to-brim"
              onClick={() => updateConfig({ matchWinCondition: 'up-to-brim' })}
              style={pillStyle(config.matchWinCondition === 'up-to-brim')}
            >
              Up to the Brim
            </button>
          )}
          {config.matchWinCondition === 'fixed-rounds' && ![1,3,5].includes(config.totalRounds) && (
            <input
              type="number"
              min={1}
              max={99}
              value={config.totalRounds}
              onChange={e => updateConfig({ totalRounds: Math.max(1, Math.min(99, Number(e.target.value))) })}
              style={{ width: 56, marginLeft: 8, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: '2px 6px' }}
            />
          )}
        </div>
        {config.matchWinCondition === 'up-to-brim' && config.mode === 'fullboard' && (
          <div style={{ marginTop: 6, fontSize: 13, color: '#6a6a7a' }}>
            Play until the board is completely filled.
          </div>
        )}
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

      {/* Accessibility */}
      <div className="setting-card" style={cardStyle}>
        <label style={labelStyle}>Accessibility</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleToggleHighContrast}
            style={pillStyle(highContrast)}
            aria-pressed={highContrast}
          >
            {highContrast ? '✓ ' : ''}High Contrast
          </button>
          <button
            onClick={toggleReduceMotion}
            style={pillStyle(reduceMotion)}
            aria-pressed={reduceMotion}
          >
            {reduceMotion ? '✓ ' : ''}Reduce Motion
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.95em', fontWeight: 600 }}>Text Size</span>
          <button
            onClick={decreaseTextSize}
            disabled={textSize <= 0}
            style={{ ...pillStyle(false), opacity: textSize <= 0 ? 0.4 : 1, minWidth: '36px' }}
            aria-label="Decrease text size"
          >
            −
          </button>
          <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{textSize}</span>
          <button
            onClick={increaseTextSize}
            disabled={textSize >= 2}
            style={{ ...pillStyle(false), opacity: textSize >= 2 ? 0.4 : 1, minWidth: '36px' }}
            aria-label="Increase text size"
          >
            +
          </button>
        </div>
      </div>

      {/* Player config */}
      {config.players.map((player, idx) => (
        <div key={player.id} className="setting-card" style={{
          ...cardStyle, borderLeft: `4px solid ${player.color}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          {/* Large avatar circle */}
          <div style={{
            width: 52, height: 52,
            borderRadius: '50%',
            backgroundColor: player.color,
            border: '3px solid var(--color-neutral-900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 0 ${darkenColor(player.color, 0.25)}`,
          }}>
            <AvatarIcon avatar={player.avatar ?? 'cat'} size={36} color="#fff" />
          </div>

          {/* Name + human/bot toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
            {player.type === 'human' ? (
              <input
                value={player.name}
                onChange={(e) => setPlayerName(idx, e.target.value)}
                maxLength={20}
                style={{
                  fontWeight: 600, color: 'var(--color-neutral-900)', fontSize: '16px',
                  border: 'none', background: 'transparent', outline: 'none',
                  borderBottom: '2px solid transparent', padding: '2px 0',
                  transition: 'border-color 0.15s ease', width: '140px',
                  textAlign: 'center',
                }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = player.color; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
              />
            ) : (
              <span style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{player.name}</span>
            )}
            <button onClick={() => toggleBot(idx)} style={pillStyle(false)}>
              {player.type === 'human' ? '👤 Human' : '🤖 Bot'}
            </button>
          </div>

          {/* Avatar selector */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {PLAYER_AVATARS.map(av => (
              <button
                key={av}
                onClick={() => setPlayerAvatar(idx, av)}
                aria-label={`Select ${av} avatar`}
                style={{
                  width: 32, height: 32, padding: 0,
                  borderRadius: '50%',
                  border: player.avatar === av ? '3px solid var(--color-neutral-900)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AvatarIcon avatar={av} size={26} color={player.color} />
              </button>
            ))}
          </div>

          {/* Color swatch strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
            {PIECE_COLOR_PALETTE.map(color => {
              const isSelected = player.color === color;
              const takenByOther = !isSelected && config.players.some(p => p.color === color);
              return (
                <button
                  key={color}
                  disabled={takenByOther}
                  onClick={() => setPlayerColor(idx, color)}
                  aria-label={`Select color ${color}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: isSelected ? '3px solid var(--color-neutral-900)' : '2px solid var(--color-neutral-900)',
                    backgroundColor: color,
                    cursor: takenByOther ? 'not-allowed' : 'pointer',
                    opacity: takenByOther ? 0.35 : 1,
                    position: 'relative' as const,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px var(--color-neutral-900)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {takenByOther && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--color-neutral-900)',
                      lineHeight: 1,
                      pointerEvents: 'none' as const,
                    }}>✕</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bot difficulty */}
          {player.type === 'bot' && (
            <div style={{ display: 'flex', gap: '8px' }}>
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
  backgroundColor: 'var(--color-bg-surface)',
  backdropFilter: 'blur(8px)',
  borderRadius: '16px',
  border: '2px solid var(--color-neutral-900)',
  boxShadow: '4px 4px 0 var(--color-neutral-900)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 700,
  color: 'var(--color-neutral-400)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: '24px',
    border: '2px solid var(--color-neutral-900)',
    backgroundColor: active ? '#FF6FAF' : 'var(--color-neutral-50)',
    color: active ? '#fff' : 'var(--color-neutral-900)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: '44px',
    minWidth: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '14px 32px',
  borderRadius: '16px',
  border: '2px solid var(--color-neutral-900)',
  backgroundColor: '#FF6FAF',
  color: '#fff',
  fontWeight: 700,
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '4px 4px 0 var(--color-neutral-900)',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '14px 24px',
  borderRadius: '16px',
  border: '2px solid var(--color-neutral-900)',
  backgroundColor: 'var(--color-neutral-50)',
  color: 'var(--color-neutral-900)',
  fontWeight: 600,
  fontSize: '16px',
  cursor: 'pointer',
  boxShadow: '4px 4px 0 var(--color-neutral-900)',
};
