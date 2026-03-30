import React, { useEffect, useState } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { api } from '../services/api.ts';

const cardStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: '16px',
  border: '2px solid #17171F',
  backgroundColor: '#F3ECFF',
  boxShadow: '4px 4px 0 #17171F',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '2px solid #17171F',
  backgroundColor: '#FAF7FB',
  fontSize: '14px',
  fontWeight: 500,
  color: '#17171F',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnSmall = (color: string): React.CSSProperties => ({
  padding: '8px 18px', borderRadius: '12px',
  border: '2px solid #17171F', backgroundColor: color,
  color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
  boxShadow: '3px 3px 0 #17171F',
});

interface PublicRoom {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  mode: string;
  connectN: number;
}

export const RoomBrowser: React.FC = () => {
  const setOnlinePhase = useOnlineStore(s => s.setOnlinePhase);
  const createRoom = useOnlineStore(s => s.createRoom);
  const joinRoom = useOnlineStore(s => s.joinRoom);

  // Create room form
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2);
  const [mode, setMode] = useState<'classic' | 'fullboard'>('classic');
  const [connectN, setConnectN] = useState<4 | 5 | 6>(4);
  const [isPublic, setIsPublic] = useState(true);
  const [totalRounds, setTotalRounds] = useState(3);

  // Join by code
  const [inviteCode, setInviteCode] = useState('');

  // Public rooms list
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getPublicRooms();
      setRooms(data.rooms);
    } catch {
      // ignore - server may be unavailable
    }
    setLoading(false);
  };

  const handleCreate = () => {
    if (!roomName.trim()) return;
    createRoom({
      name: roomName.trim(),
      maxPlayers,
      mode,
      connectN,
      isPublic,
      totalRounds,
    });
  };

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) return;
    joinRoom('', inviteCode.trim());
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100vh', gap: '20px', padding: '32px', maxWidth: '480px', margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px', fontWeight: 800, color: '#17171F',
        fontFamily: 'var(--font-display)', margin: 0,
      }}>
        Custom Rooms
      </h2>

      {/* Create room */}
      <div style={{ ...cardStyle, width: '100%' }}>
        <h3 style={{
          fontSize: '16px', fontWeight: 700, color: '#FF6FAF',
          margin: '0 0 14px', fontFamily: 'var(--font-display)',
        }}>
          Create a Room
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text" placeholder="Room name" value={roomName}
            onChange={e => setRoomName(e.target.value)} maxLength={30}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>Mode</label>
              <select
                value={mode} onChange={e => setMode(e.target.value as 'classic' | 'fullboard')}
                style={{ ...inputStyle, marginTop: '4px' }}
              >
                <option value="classic">Classic</option>
                <option value="fullboard">Full Board</option>
              </select>
            </div>
            <div style={{ minWidth: '80px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>Connect</label>
              <select
                value={connectN} onChange={e => setConnectN(Number(e.target.value) as 4 | 5 | 6)}
                style={{ ...inputStyle, marginTop: '4px' }}
              >
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '80px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>Players</label>
              <select
                value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
                style={{ ...inputStyle, marginTop: '4px' }}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div style={{ minWidth: '80px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9C9CB1', textTransform: 'uppercase' }}>Rounds</label>
              <select
                value={totalRounds} onChange={e => setTotalRounds(Number(e.target.value))}
                style={{ ...inputStyle, marginTop: '4px' }}
              >
                {[1, 3, 5, 7].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: '#17171F',
              }}>
                <input
                  type="checkbox" checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                />
                Public
              </label>
            </div>
          </div>
          <button onClick={handleCreate} style={{
            ...btnSmall('#FF6FAF'), width: '100%', padding: '12px',
            fontSize: '15px',
          }}>
            Create Room
          </button>
        </div>
      </div>

      {/* Join by code */}
      <div style={{ ...cardStyle, width: '100%' }}>
        <h3 style={{
          fontSize: '16px', fontWeight: 700, color: '#64E0C6',
          margin: '0 0 10px', fontFamily: 'var(--font-display)',
        }}>
          Join by Invite Code
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text" placeholder="Enter code" value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleJoinByCode} style={btnSmall('#64E0C6')}>
            Join
          </button>
        </div>
      </div>

      {/* Public rooms */}
      <div style={{ ...cardStyle, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{
            fontSize: '16px', fontWeight: 700, color: '#FFD36B',
            margin: 0, fontFamily: 'var(--font-display)',
          }}>
            Public Rooms
          </h3>
          <button onClick={loadRooms} style={{
            padding: '4px 12px', borderRadius: '8px',
            border: '1.5px solid #17171F', backgroundColor: '#FAF7FB',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#9C9CB1',
          }}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p style={{ color: '#9C9CB1', fontSize: '13px', textAlign: 'center' }}>Loading...</p>
        ) : rooms.length === 0 ? (
          <p style={{ color: '#9C9CB1', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>
            No public rooms available
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rooms.map(room => (
              <div key={room.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: '12px',
                backgroundColor: '#FAF7FB', border: '1.5px solid #17171F',
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#17171F' }}>{room.name}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9C9CB1' }}>
                    {room.hostName} · {room.mode} · Connect {room.connectN} · {room.playerCount}/{room.maxPlayers}
                  </p>
                </div>
                <button onClick={() => joinRoom(room.id)} style={btnSmall('#64E0C6')}>
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setOnlinePhase('menu')} style={{
        padding: '10px 24px', borderRadius: '12px',
        border: '2px solid #17171F', backgroundColor: '#FAF7FB',
        color: '#9C9CB1', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
      }}>
        ← Back
      </button>
    </div>
  );
};
