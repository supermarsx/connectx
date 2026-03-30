import React, { useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';

const cardStyle: React.CSSProperties = {
  padding: '28px 24px',
  borderRadius: '16px',
  border: '3px solid #17171F',
  backgroundColor: '#F3ECFF',
  boxShadow: '5px 5px 0 #17171F',
  width: '100%',
  maxWidth: '360px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '2px solid #17171F',
  backgroundColor: '#FAF7FB',
  fontSize: '15px',
  fontWeight: 500,
  color: '#17171F',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  width: '100%',
  padding: '14px 24px',
  borderRadius: '14px',
  border: '2px solid #17171F',
  backgroundColor: disabled ? '#E0D6E6' : color,
  color: '#fff',
  fontWeight: 700,
  fontSize: '16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '4px 4px 0 #17171F',
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
          fontSize: '36px', fontWeight: 800, color: '#17171F', margin: 0,
          letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          Connect<span style={{ color: '#FF6FAF' }}>X</span> Online
        </h1>
        <p style={{ fontSize: '14px', color: '#9C9CB1', marginTop: '6px', fontWeight: 500 }}>
          Play against friends & rivals worldwide
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['login', 'register'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setLocalError(''); clearAuthError(); }} style={{
            padding: '8px 24px', borderRadius: '12px',
            border: '2px solid #17171F',
            backgroundColor: tab === t ? '#FF6FAF' : '#FAF7FB',
            color: tab === t ? '#fff' : '#17171F',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            boxShadow: tab === t ? '3px 3px 0 #17171F' : 'none',
          }}>
            {t === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'register' && (
            <input
              type="text" placeholder="Username" value={username}
              onChange={e => setUsername(e.target.value)} maxLength={20}
              style={inputStyle}
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          {tab === 'register' && (
            <input
              type="password" placeholder="Confirm Password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          )}
          {error && (
            <p style={{ color: '#E35591', fontSize: '13px', fontWeight: 600, margin: 0 }}>
              {error}
            </p>
          )}
          <button
            onClick={tab === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            style={btnStyle('#FF6FAF', loading)}
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </div>
      </div>

      {/* Skip button */}
      <button onClick={() => {
        useOnlineStore.getState().isOnlineFlow && useOnlineStore.setState({ isOnlineFlow: false });
      }} style={{
        padding: '10px 24px', borderRadius: '12px',
        border: '2px solid #17171F', backgroundColor: '#FAF7FB',
        color: '#9C9CB1', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
      }}>
        ← Back to Local Play
      </button>
    </div>
  );
};
