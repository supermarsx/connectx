import React, { useState, useEffect, useCallback } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { api } from '../services/api.ts';

type Tab = 'friends' | 'pending' | 'add';

interface Friend {
  userId: string;
  username: string;
  rating: number;
  isOnline: boolean;
}

interface PendingRequest {
  userId: string;
  username: string;
  createdAt: string;
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 0',
  border: 'none',
  borderBottom: active ? '3px solid #FF6FAF' : '3px solid transparent',
  backgroundColor: 'transparent',
  color: active ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'var(--font-body)',
});

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  borderRadius: '16px',
  border: '3px solid var(--color-neutral-900)',
  backgroundColor: 'var(--color-bg-card)',
  boxShadow: '5px 5px 0 var(--color-neutral-900)',
  overflow: 'hidden',
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '10px',
  border: '2px solid var(--color-neutral-900)',
  backgroundColor: color,
  color: 'var(--color-neutral-900)',
  fontWeight: 700,
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
});

export const FriendsScreen: React.FC = () => {
  const setOnlinePhase = useOnlineStore(s => s.setOnlinePhase);
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ userId: string; username: string; rating: number }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFriends();
      setFriends(data.friends);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPendingRequests();
      setPending(data.requests);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'friends') loadFriends();
    if (tab === 'pending') loadPending();
  }, [tab, loadFriends, loadPending]);

  const handleAccept = async (requesterId: string) => {
    try {
      await api.acceptFriendRequest(requesterId);
      setMessage('Friend request accepted!');
      loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept');
    }
  };

  const handleDecline = async (requesterId: string) => {
    try {
      await api.declineFriendRequest(requesterId);
      setMessage('Request declined');
      loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeFriend(userId);
      setMessage('Friend removed');
      loadFriends();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  };

  const handleSendRequest = async () => {
    if (!searchUsername.trim()) return;
    setError(null);
    setMessage(null);
    setSearchResults([]);
    setSearchLoading(true);
    try {
      const data = await api.searchUsers(searchUsername.trim());
      if (!data.users || data.users.length === 0) {
        setError('User not found');
      } else {
        setSearchResults(data.users);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    setError(null);
    setMessage(null);
    try {
      await api.sendFriendRequest(userId);
      setMessage('Friend request sent!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send request');
    }
  };

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '32px',
    }}>
      {/* Header */}
      <h1 style={{
        fontSize: '30px', fontWeight: 800, color: 'var(--color-neutral-900)', margin: 0,
        letterSpacing: '-1px', fontFamily: 'var(--font-display)',
      }}>
        Friends
      </h1>

      {/* Feedback messages */}
      {message && (
        <div style={{
          padding: '8px 16px', borderRadius: '10px', backgroundColor: '#D4EDDA',
          color: '#155724', fontWeight: 600, fontSize: '13px',
        }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{
          padding: '8px 16px', borderRadius: '10px', backgroundColor: '#F8D7DA',
          color: '#721C24', fontWeight: 600, fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', borderBottom: '2px solid var(--color-neutral-900)' }}>
          <button style={tabStyle(tab === 'friends')} onClick={() => { setTab('friends'); clearMessages(); }}>
            Friends
          </button>
          <button style={tabStyle(tab === 'pending')} onClick={() => { setTab('pending'); clearMessages(); }}>
            Pending
          </button>
          <button style={tabStyle(tab === 'add')} onClick={() => { setTab('add'); clearMessages(); }}>
            Add Friend
          </button>
        </div>

        <div style={{ padding: '16px', minHeight: '200px' }}>
          {/* Friends Tab */}
          {tab === 'friends' && (
            loading ? (
              <div style={{ textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Loading...</div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
                No friends yet. Add some!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {friends.map((f) => (
                  <div key={f.userId} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: 'var(--color-neutral-50)', border: '2px solid #E8E0F0',
                  }}>
                    {/* Online indicator */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: f.isOnline ? '#22C55E' : '#D1D5DB',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)' }}>
                      {f.username}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#E5A800' }}>
                      ⭐ {f.rating}
                    </span>
                    <button
                      onClick={() => handleRemove(f.userId)}
                      style={btnStyle('var(--color-neutral-50)')}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Pending Tab */}
          {tab === 'pending' && (
            loading ? (
              <div style={{ textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>Loading...</div>
            ) : pending.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
                No pending requests
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pending.map((p) => (
                  <div key={p.userId} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: 'var(--color-neutral-50)', border: '2px solid #E8E0F0',
                  }}>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)' }}>
                      {p.username}
                    </span>
                    <button onClick={() => handleAccept(p.userId)} style={btnStyle('#64E0C6')}>
                      Accept
                    </button>
                    <button onClick={() => handleDecline(p.userId)} style={btnStyle('var(--color-neutral-50)')}>
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Add Friend Tab */}
          {tab === 'add' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)' }}>
                Search by username
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest(); }}
                  placeholder="Enter username..."
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                    border: '2px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
                    fontSize: '14px', fontFamily: 'var(--font-body)',
                    outline: 'none',
                  }}
                />
                <button onClick={handleSendRequest} disabled={searchLoading} style={btnStyle('#FF6FAF')}>
                  {searchLoading ? '...' : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((u) => (
                    <div key={u.userId} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px', borderRadius: '10px',
                      backgroundColor: 'var(--color-neutral-50)', border: '2px solid #E8E0F0',
                    }}>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: '14px', color: 'var(--color-neutral-900)' }}>
                        {u.username}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#E5A800' }}>
                        ⭐ {u.rating}
                      </span>
                      <button onClick={() => handleAddFriend(u.userId)} style={btnStyle('#64E0C6')}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => setOnlinePhase('menu')}
        style={{
          padding: '10px 28px', borderRadius: '12px',
          border: '3px solid var(--color-neutral-900)', backgroundColor: 'var(--color-neutral-50)',
          color: 'var(--color-neutral-900)', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
          boxShadow: '3px 3px 0 var(--color-neutral-900)', fontFamily: 'var(--font-body)',
        }}
      >
        ← Back to Menu
      </button>
    </div>
  );
};
