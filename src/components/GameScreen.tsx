import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { isValidMove } from '../engine/index.ts';
import { playDrop, playTurnChange, playWin, playDrawLoss } from '../engine/sound.ts';
import { Board } from './Board.tsx';
import { AvatarIcon } from './AvatarIcon.tsx';

export const GameScreen: React.FC = () => {
  const board = useGameStore(s => s.board);
  const config = useGameStore(s => s.config);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const round = useGameStore(s => s.round);
  const scores = useGameStore(s => s.scores);
  const winner = useGameStore(s => s.winner);
  const isDraw = useGameStore(s => s.isDraw);
  const phase = useGameStore(s => s.phase);
  const blockedCells = useGameStore(s => s.blockedCells);
  const moveHistory = useGameStore(s => s.moveHistory);
  const makeMove = useGameStore(s => s.makeMove);
  const nextRound = useGameStore(s => s.nextRound);
  const resetToMenu = useGameStore(s => s.resetToMenu);
  const resetToLobby = useGameStore(s => s.resetToLobby);
  const triggerBotMove = useGameStore(s => s.triggerBotMove);
  const startMatch = useGameStore(s => s.startMatch);

  const muted = useSettingsStore(s => s.muted);
  const toggleMute = useSettingsStore(s => s.toggleMute);
  const colorblindPatterns = useSettingsStore(s => s.colorblindPatterns);

  const currentPlayer = config.players[currentPlayerIndex];
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

  // Bot auto-play
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'playing' && currentPlayer?.type === 'bot') {
      botTimerRef.current = setTimeout(() => {
        triggerBotMove();
      }, 500);
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [phase, currentPlayerIndex, currentPlayer?.type, triggerBotMove]);

  // Sound effects
  const prevMoveCount = useRef(moveHistory.length);
  const prevPhaseForSound = useRef(phase);
  const prevPlayerIdx = useRef(currentPlayerIndex);

  useEffect(() => {
    if (moveHistory.length > prevMoveCount.current) {
      playDrop();
    }
    prevMoveCount.current = moveHistory.length;
  }, [moveHistory.length]);

  useEffect(() => {
    if (phase === 'playing' && prevPlayerIdx.current !== currentPlayerIndex && prevPhaseForSound.current === 'playing') {
      playTurnChange();
    }
    prevPlayerIdx.current = currentPlayerIndex;
  }, [currentPlayerIndex, phase]);

  useEffect(() => {
    if ((phase === 'roundEnd' || phase === 'matchEnd') && prevPhaseForSound.current === 'playing') {
      if (winner) {
        playWin();
      } else if (isDraw) {
        playDrawLoss();
      }
    }
    prevPhaseForSound.current = phase;
  }, [phase, winner, isDraw]);

  const [shakeColumn, setShakeColumn] = useState<number | null>(null);

  // Emote state
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleEmote = useCallback((emote: string) => {
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    setActiveEmote(emote);
    emoteTimerRef.current = setTimeout(() => setActiveEmote(null), 2000);
  }, []);
  useEffect(() => {
    return () => { if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current); };
  }, []);

  const handleColumnClick = useCallback((col: number) => {
    if (phase !== 'playing') return;
    if (currentPlayer?.type === 'bot') return;
    if (!isValidMove(board, col, blockedCells)) {
      setShakeColumn(col);
      setTimeout(() => setShakeColumn(null), 300);
      return;
    }
    makeMove(col);
  }, [phase, currentPlayer?.type, makeMove, board, blockedCells]);

  const isRoundOver = phase === 'roundEnd' || phase === 'matchEnd';

  const sidebarCardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: 'var(--color-bg-surface)',
    backdropFilter: 'blur(6px)',
    borderRadius: '16px',
    border: '2px solid var(--color-neutral-900)',
    boxShadow: '3px 3px 0 var(--color-neutral-900)',
  };

  return (
    <div className="game-layout" style={{
      backgroundColor: 'rgba(250,247,251,0.3)', borderRadius: '24px',
      backdropFilter: 'blur(2px)',
    }}>
      {/* LEFT SIDEBAR — Match details (desktop only) */}
      <aside className="game-sidebar">
        <div style={sidebarCardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Match Info</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-900)', marginBottom: '4px' }}>
            <strong>Mode:</strong> {config.mode === 'classic' ? 'Classic' : 'Full Board'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-900)', marginBottom: '4px' }}>
            <strong>Connect:</strong> {config.board.connectN}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-900)', marginBottom: '4px' }}>
            <strong>Round:</strong> {round}/{config.totalRounds}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-neutral-900)' }}>
            <strong>Board:</strong> {config.board.rows}×{config.board.cols}
          </p>
        </div>
        <div style={sidebarCardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Scores</h3>
          {config.players.map(player => (
            <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {player.avatar ? <AvatarIcon avatar={player.avatar} size={20} color={player.color} />
                : <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: player.color }} />}
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-900)' }}>{player.name}</span>
              <span style={{ fontWeight: 800, fontSize: '16px', color: player.color }}>{scores[player.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER — Main game content */}
      <div className="game-center">
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '14px', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
          {config.mode === 'classic' ? 'CLASSIC' : 'FULL BOARD'} · Connect {config.board.connectN}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '18px', color: 'var(--color-neutral-400)', padding: '4px',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div style={{ fontSize: '14px', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
            Round {round}/{config.totalRounds}
          </div>
        </div>
      </div>

      {/* Current turn indicator */}
      {phase === 'playing' && currentPlayer && (
        <div key={currentPlayerIndex} role="status" aria-live="polite" style={{
          padding: '10px 24px',
          borderRadius: '24px',
          backgroundColor: currentPlayer.color,
          color: '#fff',
          fontWeight: 700,
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'turnSlideIn 0.3s ease-out',
          transition: 'background-color 0.3s ease',
        }}>
          {currentPlayer.avatar
            ? <AvatarIcon avatar={currentPlayer.avatar} size={24} color={currentPlayer.color} />
            : (currentPlayer.type === 'bot' ? '🤖' : '👤')}
          {' '}{currentPlayer.name}'s Turn
        </div>
      )}

      {/* Round/Match end overlay */}
      {isRoundOver && (<>
        {/* Connect N! banner */}
        {winner && !isDraw && (
          <div className="win-banner" style={{
            padding: '12px 40px',
            backgroundColor: config.players.find(p => p.id === winner)?.color ?? '#FF6FAF',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 800,
            fontFamily: 'var(--font-display, Poppins, sans-serif)',
            textAlign: 'center',
            border: '3px solid var(--color-neutral-900)',
            boxShadow: '5px 5px 0 var(--color-neutral-900)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Connect {config.board.connectN}!
          </div>
        )}
        <div style={{
          padding: '16px 32px',
          borderRadius: '20px',
          backgroundColor: 'var(--color-bg-surface)',
          backdropFilter: 'blur(8px)',
          border: '3px solid var(--color-neutral-900)',
          boxShadow: '6px 6px 0 var(--color-neutral-900)',
          textAlign: 'center',
        }}>
          {isDraw ? (
            <h3 style={{ fontSize: '20px', color: '#FFC155', margin: '0 0 8px' }}>It's a Draw!</h3>
          ) : winner ? (
            <h3 style={{
              color: config.players.find(p => p.id === winner)?.color ?? 'var(--color-neutral-900)',
              margin: '0 0 8px',
              fontSize: '24px',
              fontFamily: 'var(--font-display, Poppins, sans-serif)',
            }}>
              🎉 {config.players.find(p => p.id === winner)?.name} Wins!
            </h3>
          ) : null}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {phase === 'roundEnd' && (
              <button onClick={nextRound} style={actionBtnStyle('#64E0C6')}>
                Next Round →
              </button>
            )}
            {phase === 'matchEnd' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--color-neutral-900)', fontWeight: 600, marginBottom: '12px' }}>
                  Match Over!
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={startMatch} style={actionBtnStyle('#64E0C6')}>Rematch</button>
                  <button onClick={resetToLobby} style={actionBtnStyle('#FFD36B')}>Re-lobby</button>
                  <button onClick={resetToMenu} style={actionBtnStyle('#FF6FAF')}>Back to Menu</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>)}

      {/* Emote toast */}
      {activeEmote && (
        <div className="emote-toast" style={{
          fontSize: '36px', padding: '8px 20px', borderRadius: '16px',
          backgroundColor: 'rgba(243, 236, 255, 0.95)', border: '2px solid var(--color-neutral-900)',
          boxShadow: '3px 3px 0 var(--color-neutral-900)', pointerEvents: 'none',
        }}>
          {activeEmote}
        </div>
      )}

      {/* Board */}
      <Board
        board={board}
        config={config.board}
        blocked={blockedCells}
        winner={winner}
        lastMove={lastMove ? { row: lastMove.row, col: lastMove.col } : null}
        players={config.players}
        onColumnClick={handleColumnClick}
        mode={config.mode}
        currentPlayerColor={currentPlayer?.color ?? '#ccc'}
        gameActive={phase === 'playing' && currentPlayer?.type !== 'bot'}
        shakeColumn={shakeColumn}
        forceColorblindPatterns={colorblindPatterns}
      />

      {/* Bottom controls — fixed on mobile */}
      <div className="game-bottom-controls">
        {/* Scoreboard (mobile only — shown in sidebar on desktop) */}
        <div className="mobile-only" style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {config.players.map(player => (
            <div key={player.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '12px',
              backgroundColor: 'var(--color-bg-surface)', backdropFilter: 'blur(6px)',
              border: '2px solid var(--color-neutral-900)',
              boxShadow: '3px 3px 0 var(--color-neutral-900)',
            }}>
              {player.avatar
                ? <AvatarIcon avatar={player.avatar} size={20} color={player.color} />
                : <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: player.color,
                  }} />}
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-neutral-900)' }}>
                {player.name}
              </span>
              <span style={{
                fontWeight: 800, fontSize: '18px',
                color: player.color, marginLeft: '4px',
              }}>
                {scores[player.id] ?? 0}
              </span>
            </div>
          ))}
        </div>

        {/* Emote panel (mobile only — shown in sidebar on desktop) */}
        {phase === 'playing' && (
          <div className="mobile-only" style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {EMOTES.map(emote => (
              <button key={emote} onClick={() => handleEmote(emote)} style={{
                padding: '6px 12px', borderRadius: '20px', border: '1.5px solid var(--color-cell-empty)',
                backgroundColor: 'var(--color-neutral-50)', fontSize: '18px', cursor: 'pointer',
                lineHeight: 1,
              }}>
                {emote}
              </button>
            ))}
          </div>
        )}

        {/* Menu button */}
        {phase === 'playing' && (
          <button onClick={resetToMenu} style={{
            padding: '8px 20px', borderRadius: '12px',
            border: '2px solid var(--color-neutral-900)', backgroundColor: 'rgba(250,247,251,0.9)',
            backdropFilter: 'blur(4px)',
            color: 'var(--color-neutral-400)', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', marginTop: '8px',
          }}>
            Quit to Menu
          </button>
        )}
      </div>
      </div>{/* end game-center */}

      {/* RIGHT SIDEBAR — Emotes + moves (desktop only) */}
      <aside className="game-sidebar">
        {phase === 'playing' && (
          <div style={sidebarCardStyle}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Emotes</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOTES.map(emote => (
                <button key={emote} onClick={() => handleEmote(emote)} style={{
                  padding: '6px 10px', borderRadius: '16px', border: '1.5px solid var(--color-cell-empty)',
                  backgroundColor: 'var(--color-neutral-50)', fontSize: '16px', cursor: 'pointer', lineHeight: 1,
                }}>{emote}</button>
              ))}
            </div>
          </div>
        )}
        <div style={sidebarCardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Moves</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', color: 'var(--color-neutral-700)' }}>
            {moveHistory.length === 0 ? (
              <p style={{ color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>No moves yet</p>
            ) : (
              moveHistory.slice(-10).reverse().map((move, i) => {
                const player = config.players.find(p => p.id === move.player);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: player?.color ?? '#ccc', flexShrink: 0 }} />
                    <span>{player?.name ?? `P${move.player}`}: Col {move.col + 1}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

const EMOTES = ['👏', '😄', '🔥', '😱', '🤔', '😎', '💀', 'gg'];

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '12px 24px',
    borderRadius: '16px',
    border: '2px solid var(--color-neutral-900)',
    backgroundColor: bg,
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '4px 4px 0 var(--color-neutral-900)',
  };
}
