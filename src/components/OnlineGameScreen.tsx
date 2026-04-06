import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { Board } from './Board.tsx';
import type { PlayerConfig, BoardConfig } from '../engine/types.ts';

const EMOTES = ['👏', '😄', '🔥', '😱', '🤔', '😎', '💀', 'gg'];

export const OnlineGameScreen: React.FC = () => {
  const onlineMatch = useOnlineStore(s => s.onlineMatch);
  const onlinePhase = useOnlineStore(s => s.onlinePhase);
  const submitMove = useOnlineStore(s => s.submitMove);
  const requestRematch = useOnlineStore(s => s.requestRematch);
  const setOnlinePhase = useOnlineStore(s => s.setOnlinePhase);
  const colorblindPatterns = useSettingsStore(s => s.colorblindPatterns);

  const [shakeColumn, setShakeColumn] = useState<number | null>(null);
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current); };
  }, []);

  const handleEmote = useCallback((emote: string) => {
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    setActiveEmote(emote);
    emoteTimerRef.current = setTimeout(() => setActiveEmote(null), 2000);
  }, []);

  if (!onlineMatch) return null;

  const { board, currentTurn, myPlayerId, players, scores, round, totalRounds, config, winner, isDraw, lastMove, disconnectedPlayers, ratingChanges, rematchVotes } = onlineMatch;

  const isMyTurn = currentTurn === myPlayerId;
  const isRoundOver = onlinePhase === 'online-round-end' || onlinePhase === 'online-match-end';
  const myPlayer = players.find(p => p.id === myPlayerId);

  // Build player configs for Board component
  const playerConfigs: PlayerConfig[] = players.map((p, i) => ({
    id: i + 1,
    name: p.name,
    type: p.isBot ? 'bot' as const : 'human' as const,
    color: p.color,
  }));

  // Build id-to-index map for board rendering
  const playerIdToIndex = new Map<string, number>();
  players.forEach((p, i) => { playerIdToIndex.set(p.id, i + 1); });

  // Convert server board (string player IDs as numbers) to local board (1-indexed player IDs)
  const localBoard = board.map(row =>
    row.map(cell => {
      if (cell === 0) return 0;
      // Server board uses numeric indices matching player order
      return cell;
    })
  );

  const boardConfig: BoardConfig = {
    rows: config.rows,
    cols: config.cols,
    connectN: config.connectN,
  };

  const blockedCells = Array.from({ length: config.rows }, () =>
    Array.from({ length: config.cols }, () => false)
  );

  // Find winner player index for Board
  const winnerPlayerId = winner ? (players.findIndex(p => p.id === winner) + 1 || null) : null;

  const handleColumnClick = useCallback((col: number) => {
    if (!isMyTurn || isRoundOver) return;
    // Check if column is full
    if (board[0]?.[col] !== 0) {
      setShakeColumn(col);
      setTimeout(() => setShakeColumn(null), 300);
      return;
    }
    submitMove(col);
  }, [isMyTurn, isRoundOver, board, submitMove]);

  const handleBackToMenu = () => {
    setOnlinePhase('menu');
  };

  const handleBackToLocal = () => {
    useOnlineStore.setState({ isOnlineFlow: false, onlinePhase: 'auth' });
  };

  const currentPlayerColor = (() => {
    const turnPlayer = players.find(p => p.id === currentTurn);
    return turnPlayer?.color ?? '#ccc';
  })();

  const sidebarCardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: 'rgba(243,236,255,0.92)',
    backdropFilter: 'blur(6px)',
    borderRadius: '16px',
    border: '2px solid #17171F',
    boxShadow: '3px 3px 0 #17171F',
  };

  return (
    <div className="game-layout" style={{
      backgroundColor: 'rgba(250,247,251,0.3)', borderRadius: '24px',
      backdropFilter: 'blur(2px)',
    }}>
      {/* LEFT SIDEBAR */}
      <aside className="game-sidebar">
        <div style={sidebarCardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Match Info</h3>
          <p style={{ fontSize: '13px', color: '#17171F', marginBottom: '4px' }}>
            <strong>Mode:</strong> {config.mode === 'classic' ? 'Classic' : 'Full Board'}
          </p>
          <p style={{ fontSize: '13px', color: '#17171F', marginBottom: '4px' }}>
            <strong>Connect:</strong> {config.connectN}
          </p>
          <p style={{ fontSize: '13px', color: '#17171F' }}>
            <strong>Round:</strong> {round}/{totalRounds}
          </p>
        </div>
        <div style={sidebarCardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Scores</h3>
          {players.map(player => (
            <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: player.color,
                border: disconnectedPlayers.includes(player.id) ? '2px dashed #9C9CB1' : 'none',
                opacity: disconnectedPlayers.includes(player.id) ? 0.5 : 1,
              }} />
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#17171F' }}>
                {player.name}
                {player.id === myPlayerId && <span style={{ color: '#9C9CB1', fontSize: '11px' }}> (you)</span>}
              </span>
              <span style={{ fontWeight: 800, fontSize: '16px', color: player.color }}>{scores[player.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER */}
      <div className="game-center">
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center',
        }}>
          <div style={{ fontSize: '14px', color: '#9C9CB1', fontWeight: 600 }}>
            {config.mode === 'classic' ? 'CLASSIC' : 'FULL BOARD'} · Connect {config.connectN}
          </div>
          <div style={{ fontSize: '14px', color: '#9C9CB1', fontWeight: 600 }}>
            Round {round}/{totalRounds}
          </div>
        </div>

        {/* Turn indicator */}
        {onlinePhase === 'online-playing' && (
          <div style={{
            padding: '10px 24px', borderRadius: '24px',
            backgroundColor: isMyTurn ? (myPlayer?.color ?? '#64E0C6') : '#9C9CB1',
            color: '#fff', fontWeight: 700, fontSize: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: isMyTurn ? 'turnSlideIn 0.3s ease-out' : 'none',
          }}>
            {isMyTurn ? '🎯 Your Turn!' : `⏳ ${players.find(p => p.id === currentTurn)?.name ?? 'Opponent'}'s Turn`}
          </div>
        )}

        {/* Disconnected player warning */}
        {disconnectedPlayers.length > 0 && (
          <div style={{
            padding: '8px 20px', borderRadius: '12px',
            backgroundColor: '#FFD36B', border: '2px solid #17171F',
            fontSize: '13px', fontWeight: 600, color: '#17171F',
          }}>
            ⚠️ {disconnectedPlayers.map(id => players.find(p => p.id === id)?.name).join(', ')} disconnected — waiting to reconnect...
          </div>
        )}

        {/* Round/Match end overlays */}
        {isRoundOver && (
          <div style={{
            padding: '16px 32px', borderRadius: '20px',
            backgroundColor: 'rgba(243,236,255,0.92)',
            backdropFilter: 'blur(8px)',
            border: '3px solid #17171F', boxShadow: '6px 6px 0 #17171F',
            textAlign: 'center',
          }}>
            {isDraw ? (
              <h3 style={{ fontSize: '20px', color: '#FFC155', margin: '0 0 8px' }}>It's a Draw!</h3>
            ) : winner ? (
              <h3 style={{
                color: players.find(p => p.id === winner)?.color ?? '#17171F',
                margin: '0 0 8px', fontSize: '24px', fontFamily: 'var(--font-display)',
              }}>
                🎉 {players.find(p => p.id === winner)?.name ?? 'Unknown'} Wins!
              </h3>
            ) : null}

            {/* Rating changes on match end */}
            {onlinePhase === 'online-match-end' && Object.keys(ratingChanges).length > 0 && (
              <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', color: '#9C9CB1', margin: '0 0 8px' }}>Rating Changes</h4>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {players.map(p => {
                    const change = ratingChanges[p.id] ?? 0;
                    return (
                      <div key={p.id} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#17171F', fontWeight: 600 }}>{p.name}</span>
                        <br />
                        <span style={{
                          fontSize: '18px', fontWeight: 800,
                          color: change > 0 ? '#64E0C6' : change < 0 ? '#E35591' : '#9C9CB1',
                        }}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              {onlinePhase === 'online-round-end' && (
                <p style={{ fontSize: '14px', color: '#9C9CB1', width: '100%', margin: '0 0 4px' }}>
                  Next round starting soon...
                </p>
              )}
              {onlinePhase === 'online-match-end' && (
                <>
                  <button onClick={requestRematch} style={actionBtnStyle('#64E0C6')}>
                    {rematchVotes.includes(myPlayerId) ? 'Rematch Requested ✓' : 'Rematch'}
                  </button>
                  <button onClick={handleBackToMenu} style={actionBtnStyle('#FFD36B')}>
                    Online Menu
                  </button>
                  <button onClick={handleBackToLocal} style={actionBtnStyle('#FF6FAF')}>
                    Local Play
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Emote toast */}
        {activeEmote && (
          <div style={{
            fontSize: '36px', padding: '8px 20px', borderRadius: '16px',
            backgroundColor: 'rgba(243, 236, 255, 0.95)', border: '2px solid #17171F',
            boxShadow: '3px 3px 0 #17171F', pointerEvents: 'none',
            position: 'absolute', top: '40%', zIndex: 10,
          }}>
            {activeEmote}
          </div>
        )}

        {/* Board */}
        <Board
          board={localBoard}
          config={boardConfig}
          blocked={blockedCells}
          winner={winnerPlayerId}
          lastMove={lastMove ? { row: lastMove.row, col: lastMove.col } : null}
          players={playerConfigs}
          onColumnClick={handleColumnClick}
          mode={config.mode}
          currentPlayerColor={currentPlayerColor}
          gameActive={isMyTurn && !isRoundOver}
          shakeColumn={shakeColumn}
          forceColorblindPatterns={colorblindPatterns}
        />

        {/* Bottom controls */}
        <div className="game-bottom-controls">
          {/* Scoreboard (mobile) */}
          <div className="mobile-only" style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {players.map(player => (
              <div key={player.id} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '12px',
                backgroundColor: 'rgba(243,236,255,0.88)', backdropFilter: 'blur(6px)',
                border: '2px solid #17171F', boxShadow: '3px 3px 0 #17171F',
                opacity: disconnectedPlayers.includes(player.id) ? 0.5 : 1,
              }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', backgroundColor: player.color,
                }} />
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#17171F' }}>
                  {player.name}{player.id === myPlayerId ? ' (you)' : ''}
                </span>
                <span style={{ fontWeight: 800, fontSize: '16px', color: player.color, marginLeft: '2px' }}>
                  {scores[player.id] ?? 0}
                </span>
              </div>
            ))}
          </div>

          {/* Emotes (mobile) */}
          {onlinePhase === 'online-playing' && (
            <div className="mobile-only" style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {EMOTES.map(emote => (
                <button key={emote} onClick={() => handleEmote(emote)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: '1.5px solid #E0D6E6',
                  backgroundColor: '#FAF7FB', fontSize: '18px', cursor: 'pointer', lineHeight: 1,
                }}>
                  {emote}
                </button>
              ))}
            </div>
          )}

          <button onClick={handleBackToMenu} style={{
            padding: '8px 20px', borderRadius: '12px',
            border: '2px solid #17171F', backgroundColor: 'rgba(250,247,251,0.9)',
            color: '#9C9CB1', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>
            Leave Match
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="game-sidebar">
        {onlinePhase === 'online-playing' && (
          <div style={sidebarCardStyle}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Emotes</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOTES.map(emote => (
                <button key={emote} onClick={() => handleEmote(emote)} style={{
                  padding: '6px 10px', borderRadius: '16px', border: '1.5px solid #E0D6E6',
                  backgroundColor: '#FAF7FB', fontSize: '16px', cursor: 'pointer', lineHeight: 1,
                }}>{emote}</button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '12px 24px', borderRadius: '16px',
    border: '2px solid #17171F', backgroundColor: bg,
    color: '#fff', fontWeight: 700, fontSize: '16px',
    cursor: 'pointer', boxShadow: '4px 4px 0 #17171F',
  };
}
