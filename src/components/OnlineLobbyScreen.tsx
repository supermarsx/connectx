import React, { useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { PIECE_COLOR_PALETTE } from '../engine/types.ts';
import { ReportModal } from './ReportModal.tsx';
import { api } from '../services/api.ts';

export const OnlineLobbyScreen: React.FC = () => {
  const currentRoom = useOnlineStore(s => s.currentRoom);
  const user = useOnlineStore(s => s.user);
  const selectColor = useOnlineStore(s => s.selectColor);
  const startRoom = useOnlineStore(s => s.startRoom);
  const leaveRoom = useOnlineStore(s => s.leaveRoom);

  const [copied, setCopied] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<string | null>(null);

  if (!currentRoom) return null;

  const isHost = user?.id === currentRoom.hostId;
  const canStart = isHost && currentRoom.players.length >= 2;
  const takenColors = currentRoom.players.map(p => p.color);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '20px', padding: '32px',
      maxWidth: '440px', margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px', fontWeight: 800, color: 'var(--color-neutral-900)',
        fontFamily: 'var(--font-display)', margin: 0,
      }}>
        Room Lobby
      </h2>

      {/* Room info */}
      <div style={{
        width: '100%', padding: '20px 24px', borderRadius: '16px',
        border: '3px solid var(--color-neutral-900)', backgroundColor: 'var(--color-bg-card)',
        boxShadow: '5px 5px 0 var(--color-neutral-900)',
      }}>
        <h3 style={{
          fontSize: '18px', fontWeight: 700, color: '#FF6FAF',
          margin: '0 0 8px', fontFamily: 'var(--font-display)',
        }}>
          {currentRoom.name || 'Untitled Room'}
        </h3>

        {/* Invite code */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '10px',
          backgroundColor: 'var(--color-neutral-50)', border: '1.5px solid var(--color-neutral-900)', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Code:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-neutral-900)', letterSpacing: '2px', flex: 1 }}>
            {currentRoom.inviteCode}
          </span>
          <button onClick={handleCopyCode} style={{
            padding: '4px 12px', borderRadius: '8px',
            border: '1.5px solid var(--color-neutral-900)', backgroundColor: copied ? '#64E0C6' : 'var(--color-neutral-50)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            color: copied ? '#fff' : 'var(--color-neutral-400)',
          }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Config */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-neutral-400)', marginBottom: '14px' }}>
          <span><strong>Mode:</strong> {currentRoom.config.mode === 'classic' ? 'Classic' : 'Full Board'}</span>
          <span><strong>Connect:</strong> {currentRoom.config.connectN}</span>
          <span><strong>Rounds:</strong> {currentRoom.config.totalRounds}</span>
        </div>

        {/* Players */}
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Players ({currentRoom.players.length}/{currentRoom.config.maxPlayers})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {currentRoom.players.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', borderRadius: '10px',
              backgroundColor: 'var(--color-neutral-50)', border: '1.5px solid var(--color-neutral-900)',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: p.color, border: '2px solid var(--color-neutral-900)', flexShrink: 0,
              }} />
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)', flex: 1 }}>
                {p.name}
                {p.id === currentRoom.hostId && (
                  <span style={{ fontSize: '11px', color: '#FFD36B', marginLeft: '6px' }}>👑 Host</span>
                )}
                {p.isBot && (
                  <span style={{ fontSize: '11px', color: 'var(--color-neutral-400)', marginLeft: '6px' }}>🤖 Bot</span>
                )}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-neutral-400)' }}>⭐ {p.rating}</span>
              {p.id !== user?.id && !p.isBot && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setReportTarget({ id: p.id, name: p.name })}
                    title="Report"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', padding: '2px 4px', color: 'var(--color-neutral-400)',
                    }}
                  >🚩</button>
                  <button
                    onClick={async () => {
                      try {
                        await api.blockPlayer(p.id);
                        setBlockFeedback(`${p.name} blocked`);
                        setTimeout(() => setBlockFeedback(null), 2500);
                      } catch {
                        setBlockFeedback('Failed to block');
                        setTimeout(() => setBlockFeedback(null), 2500);
                      }
                    }}
                    title="Block"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', padding: '2px 4px', color: '#FF4B6E',
                    }}
                  >🚫</button>
                </div>
              )}
            </div>
          ))}
          {currentRoom.players.length < currentRoom.config.maxPlayers && (
            <div style={{
              padding: '10px 12px', borderRadius: '10px',
              backgroundColor: 'var(--color-neutral-50)', border: '1.5px dashed var(--color-neutral-400)',
              textAlign: 'center', color: 'var(--color-neutral-400)', fontSize: '13px', fontStyle: 'italic',
            }}>
              Waiting for players...
            </div>
          )}
        </div>
      </div>

      {/* Color picker */}
      <div style={{
        width: '100%', padding: '16px 20px', borderRadius: '16px',
        border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-bg-card)',
        boxShadow: '3px 3px 0 var(--color-neutral-900)',
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-neutral-400)', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Choose Your Color
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PIECE_COLOR_PALETTE.map(color => {
            const isMe = currentRoom.players.find(p => p.id === user?.id)?.color === color;
            const isTaken = !isMe && takenColors.includes(color);
            return (
              <button
                key={color}
                disabled={isTaken}
                onClick={() => selectColor(color)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: color,
                  border: isMe ? '3px solid var(--color-neutral-900)' : '2px solid transparent',
                  cursor: isTaken ? 'not-allowed' : 'pointer',
                  opacity: isTaken ? 0.3 : 1,
                  boxShadow: isMe ? '0 0 0 2px #FFD36B' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {isHost && (
          <button onClick={startRoom} disabled={!canStart} style={{
            padding: '14px 28px', borderRadius: '14px',
            border: '2px solid var(--color-neutral-900)',
            backgroundColor: canStart ? '#64E0C6' : 'var(--color-disabled)',
            color: '#fff', fontWeight: 700, fontSize: '16px',
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '4px 4px 0 var(--color-neutral-900)' : 'none',
            opacity: canStart ? 1 : 0.6,
          }}>
            Start Match
          </button>
        )}
        <button onClick={leaveRoom} style={{
          padding: '14px 28px', borderRadius: '14px',
          border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
          color: 'var(--color-neutral-400)', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
        }}>
          Leave Room
        </button>
      </div>

      {/* Block feedback */}
      {blockFeedback && (
        <div style={{
          padding: '8px 20px', borderRadius: '12px',
          backgroundColor: '#64E0C6', border: '2px solid var(--color-neutral-900)',
          fontSize: '13px', fontWeight: 600, color: '#fff',
        }}>
          {blockFeedback}
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          playerId={reportTarget.id}
          playerName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};
