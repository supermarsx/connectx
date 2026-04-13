import React, { useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';

const cardStyle: React.CSSProperties = {
  padding: '28px 24px',
  borderRadius: '16px',
  border: '3px solid var(--color-neutral-900)',
  backgroundColor: 'var(--color-bg-card)',
  boxShadow: '5px 5px 0 var(--color-neutral-900)',
  width: '100%',
  maxWidth: '360px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '2px solid var(--color-neutral-900)',
  backgroundColor: 'var(--color-neutral-50)',
  fontSize: '15px',
  fontWeight: 500,
  color: 'var(--color-neutral-900)',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  width: '100%',
  padding: '14px 24px',
  borderRadius: '14px',
  border: '2px solid var(--color-neutral-900)',
  backgroundColor: disabled ? 'var(--color-disabled)' : color,
  color: '#fff',
  fontWeight: 700,
  fontSize: '16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '4px 4px 0 var(--color-neutral-900)',
  opacity: disabled ? 0.6 : 1,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
});

export const AuthScreen: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useOnlineStore(s => s.login);
  const register = useOnlineStore(s => s.register);
  const authError = useOnlineStore(s => s.authError);
  const clearAuthError = useOnlineStore(s => s.clearAuthError);

  const handleLogin = async () => {
    setLocalError('');
    clearAuthError();
    if (!email || !password) { setLocalError('Please fill in all fields'); return; }
    setLoading(true);
    try { await login(email, password); } catch { /* error set in store */ }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLocalError('');
    clearAuthError();
    if (!username || !email || !password || !confirmPassword) { setLocalError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
    if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await register(username, email, password); } catch { /* error set in store */ }
    setLoading(false);
  };

  const error = localError || authError;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '32px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '36px', fontWeight: 800, color: 'var(--color-neutral-900)', margin: 0,
          letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span> Online
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-neutral-400)', marginTop: '6px', fontWeight: 500 }}>
          Play against friends & rivals worldwide
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['login', 'register'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setLocalError(''); clearAuthError(); }} style={{
            padding: '8px 24px', borderRadius: '12px',
            border: '2px solid var(--color-neutral-900)',
            backgroundColor: tab === t ? '#FF6FAF' : 'var(--color-neutral-50)',
            color: tab === t ? '#fff' : 'var(--color-neutral-900)',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            boxShadow: tab === t ? '3px 3px 0 var(--color-neutral-900)' : 'none',
          }}>
            {t === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <form onSubmit={(e) => { e.preventDefault(); if (tab === 'login') { handleLogin(); } else { handleRegister(); } }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-username" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '4px', display: 'block' }}>Username</label>
              <input
                id="auth-username"
                type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} maxLength={20}
                autoComplete="username"
                aria-invalid={!!error}
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '4px', display: 'block' }}>Email</label>
            <input
              id="auth-email"
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!error}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="auth-password" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '4px', display: 'block' }}>Password</label>
            <input
              id="auth-password"
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={!!error}
              style={inputStyle}
            />
          </div>
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-confirm-password" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: '4px', display: 'block' }}>Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password" placeholder="Confirm Password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!error}
                style={inputStyle}
              />
            </div>
          )}
          {error && (
            <p role="alert" style={{ color: '#E35591', fontSize: '13px', fontWeight: 600, margin: 0 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={btnStyle('#FF6FAF', loading)}
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Skip button */}
      <button onClick={() => {
        sessionStorage.removeItem('connectx-online-flow');
        sessionStorage.removeItem('connectx-online-phase');
        useOnlineStore.getState().isOnlineFlow && useOnlineStore.setState({ isOnlineFlow: false });
      }} style={{
        padding: '10px 24px', borderRadius: '12px',
        border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
        color: 'var(--color-neutral-400)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
      }}>
        ← Back to Local Play
      </button>
    </div>
  );
};
