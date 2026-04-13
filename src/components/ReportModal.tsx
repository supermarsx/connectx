import React, { useState } from 'react';
import { api } from '../services/api.ts';

const REASONS = ['Cheating', 'Harassment', 'Inappropriate name', 'Other'] as const;

interface ReportModalProps {
  playerId: string;
  playerName: string;
  matchId?: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ playerId, playerName, matchId, onClose }) => {
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setStatus('submitting');
    try {
      await api.reportPlayer(playerId, reason, matchId, details || undefined);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit report');
      setStatus('error');
    }
  };

  return (
    <div onClick={onClose} onKeyDown={e => { if (e.key === 'Escape') onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(23,23,31,0.5)',
      backdropFilter: 'blur(4px)',
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-modal-title" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '380px', padding: '28px',
        backgroundColor: 'var(--color-bg-card)', borderRadius: '20px',
        border: '3px solid var(--color-neutral-900)', boxShadow: '6px 6px 0 var(--color-neutral-900)',
      }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-neutral-900)', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
              Report Submitted
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-neutral-400)', marginBottom: '16px' }}>
              Thank you. Our team will review this report.
            </p>
            <button onClick={onClose} style={btnStyle('#64E0C6')}>Close</button>
          </div>
        ) : (
          <>
            <h3 id="report-modal-title" style={{
              fontSize: '18px', fontWeight: 700, color: '#FF6FAF',
              margin: '0 0 4px', fontFamily: 'var(--font-display)',
            }}>
              Report Player
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-neutral-400)', margin: '0 0 16px' }}>
              Reporting <strong style={{ color: 'var(--color-neutral-900)' }}>{playerName}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {REASONS.map(r => (
                <label key={r} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                  backgroundColor: reason === r ? '#FFD36B' : 'var(--color-neutral-50)',
                  border: reason === r ? '2px solid var(--color-neutral-900)' : '1.5px solid var(--color-cell-empty)',
                  fontWeight: reason === r ? 700 : 500,
                  fontSize: '14px', color: 'var(--color-neutral-900)',
                }}>
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    style={{ accentColor: '#FF6FAF' }}
                  />
                  {r}
                </label>
              ))}
            </div>

            <textarea
              placeholder="Additional details (optional)"
              value={details}
              onChange={e => setDetails(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1.5px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
                fontSize: '13px', fontFamily: 'var(--font-body)',
                resize: 'vertical', marginBottom: '4px',
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--color-neutral-400)', textAlign: 'right', marginBottom: '16px' }}>
              {details.length}/2000
            </div>

            {status === 'error' && (
              <p style={{ fontSize: '13px', color: '#FF4B6E', marginBottom: '12px' }}>{errorMsg}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={btnStyle('var(--color-neutral-50)', 'var(--color-neutral-400)')}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={status === 'submitting'}
                style={btnStyle('#FF6FAF')}
              >
                {status === 'submitting' ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function btnStyle(bg: string, color = '#fff'): React.CSSProperties {
  return {
    padding: '10px 20px', borderRadius: '12px',
    border: '2px solid var(--color-neutral-900)', backgroundColor: bg,
    color, fontWeight: 700, fontSize: '14px',
    cursor: 'pointer', boxShadow: '3px 3px 0 var(--color-neutral-900)',
    fontFamily: 'var(--font-body)',
  };
}
