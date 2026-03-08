import React, { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { Board } from './Board.tsx';

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
  const triggerBotMove = useGameStore(s => s.triggerBotMove);

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

  const handleColumnClick = useCallback((col: number) => {
    if (phase !== 'playing') return;
    if (currentPlayer?.type === 'bot') return; // Don't allow clicks during bot turn
    makeMove(col);
  }, [phase, currentPlayer?.type, makeMove]);

  const isRoundOver = phase === 'roundEnd' || phase === 'matchEnd';

  return (
    <div className="game-screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '20px', padding: '24px', maxWidth: '640px', margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '14px', color: '#9C9CB1', fontWeight: 600 }}>
          {config.mode === 'classic' ? 'CLASSIC' : 'FULL BOARD'} · Connect {config.board.connectN}
        </div>
        <div style={{ fontSize: '14px', color: '#9C9CB1', fontWeight: 600 }}>
          Round {round}/{config.totalRounds}
        </div>
      </div>

      {/* Current turn indicator */}
      {phase === 'playing' && currentPlayer && (
        <div style={{
          padding: '10px 24px',
          borderRadius: '24px',
          backgroundColor: currentPlayer.color,
          color: '#fff',
          fontWeight: 700,
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'background-color 0.3s ease',
        }}>
          {currentPlayer.type === 'bot' ? '🤖' : '👤'} {currentPlayer.name}'s Turn
        </div>
      )}

      {/* Round/Match end overlay */}
      {isRoundOver && (
        <div style={{
          padding: '16px 32px',
          borderRadius: '20px',
          backgroundColor: '#fff',
          border: '3px solid #17171F',
          boxShadow: '6px 6px 0 #17171F',
          textAlign: 'center',
        }}>
          {isDraw ? (
            <h3 style={{ color: '#9C9CB1', margin: '0 0 8px' }}>It's a Draw!</h3>
          ) : winner ? (
            <h3 style={{
              color: config.players.find(p => p.id === winner)?.color ?? '#17171F',
              margin: '0 0 8px',
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
                <p style={{ color: '#17171F', fontWeight: 600, marginBottom: '12px' }}>
                  Match Over!
                </p>
                <button onClick={resetToMenu} style={actionBtnStyle('#FF6FAF')}>
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Board */}
      <Board
        board={board}
        config={config.board}
        blocked={blockedCells}
        winner={winner}
        lastMove={lastMove ? { row: lastMove.row, col: lastMove.col } : null}
        onColumnClick={handleColumnClick}
      />

      {/* Scoreboard */}
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {config.players.map(player => (
          <div key={player.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '12px',
            backgroundColor: '#fff', border: '2px solid #17171F',
            boxShadow: '3px 3px 0 #17171F',
          }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              backgroundColor: player.color,
            }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#17171F' }}>
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

      {/* Menu button */}
      {phase === 'playing' && (
        <button onClick={resetToMenu} style={{
          padding: '8px 20px', borderRadius: '12px',
          border: '2px solid #17171F', backgroundColor: '#FAF7FB',
          color: '#9C9CB1', fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', marginTop: '8px',
        }}>
          Quit to Menu
        </button>
      )}
    </div>
  );
};

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '12px 24px',
    borderRadius: '16px',
    border: '2px solid #17171F',
    backgroundColor: bg,
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '4px 4px 0 #17171F',
  };
}
