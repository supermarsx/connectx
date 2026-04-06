import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock sound module
vi.mock('../engine/sound.ts', () => ({
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  isMuted: vi.fn(() => false),
  playDrop: vi.fn(),
  playTurnChange: vi.fn(),
  playWin: vi.fn(),
  playDrawLoss: vi.fn(),
}));

// Mock the API module
vi.mock('../services/api.ts', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

// Create mock wsService using vi.hoisted to avoid initialization order issues
const { mockListeners, mockWsService } = vi.hoisted(() => {
  const listeners = new Map<string, Set<Function>>();
  return {
    mockListeners: listeners,
    mockWsService: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn(() => false),
      joinQueue: vi.fn(),
      leaveQueue: vi.fn(),
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      roomStart: vi.fn(),
      selectColor: vi.fn(),
      submitMove: vi.fn(),
      requestRematch: vi.fn(),
      chatEmote: vi.fn(),
      on: vi.fn((event: string, cb: Function) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
      }),
      off: vi.fn((event: string, cb: Function) => {
        listeners.get(event)?.delete(cb);
      }),
    },
  };
});

vi.mock('../services/ws.ts', () => ({
  wsService: mockWsService,
  WebSocketService: vi.fn(),
}));

function emitMockEvent(event: string, data?: unknown) {
  const callbacks = mockListeners.get(event);
  if (callbacks) {
    callbacks.forEach(cb => cb(data));
  }
}

import { useOnlineStore } from '../store/onlineStore.ts';
import { api, setToken, clearToken } from '../services/api.ts';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Do NOT clear mockListeners — wireEvents() only runs once due to the eventsWired flag,
  // so clearing listeners would break all subsequent socket event tests.
  useOnlineStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
    isConnected: false,
    isInQueue: false,
    queuePosition: 0,
    currentRoom: null,
    onlineMatch: null,
    onlinePhase: 'auth',
    authError: null,
    isOnlineFlow: false,
  });
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
describe('onlineStore defaults', () => {
  it('initial phase is auth', () => {
    expect(useOnlineStore.getState().onlinePhase).toBe('auth');
  });

  it('initially not authenticated', () => {
    expect(useOnlineStore.getState().isAuthenticated).toBe(false);
  });

  it('initially not connected', () => {
    expect(useOnlineStore.getState().isConnected).toBe(false);
  });

  it('initially not in queue', () => {
    expect(useOnlineStore.getState().isInQueue).toBe(false);
  });

  it('initial user is null', () => {
    expect(useOnlineStore.getState().user).toBeNull();
  });

  it('initial onlineMatch is null', () => {
    expect(useOnlineStore.getState().onlineMatch).toBeNull();
  });

  it('initial currentRoom is null', () => {
    expect(useOnlineStore.getState().currentRoom).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------
describe('login', () => {
  it('sets authenticated state on success', async () => {
    const mockUser = { id: 'u1', username: 'Alice', email: 'a@test.com' };
    (api.login as any).mockResolvedValue({ token: 'tok123', user: mockUser });

    await useOnlineStore.getState().login('a@test.com', 'pass123');

    const s = useOnlineStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual(mockUser);
    expect(s.token).toBe('tok123');
    expect(s.onlinePhase).toBe('menu');
    expect(setToken).toHaveBeenCalledWith('tok123');
  });

  it('sets authError on failure', async () => {
    (api.login as any).mockRejectedValue(new Error('Invalid credentials'));

    await expect(useOnlineStore.getState().login('a@test.com', 'wrong')).rejects.toThrow();

    expect(useOnlineStore.getState().authError).toBe('Invalid credentials');
    expect(useOnlineStore.getState().isAuthenticated).toBe(false);
  });
});

describe('register', () => {
  it('sets authenticated state on success', async () => {
    const mockUser = { id: 'u2', username: 'Bob', email: 'b@test.com' };
    (api.register as any).mockResolvedValue({ token: 'tok456', user: mockUser });

    await useOnlineStore.getState().register('Bob', 'b@test.com', 'pass123');

    const s = useOnlineStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual(mockUser);
    expect(s.token).toBe('tok456');
    expect(s.onlinePhase).toBe('menu');
  });

  it('sets authError on failure', async () => {
    (api.register as any).mockRejectedValue(new Error('Email taken'));

    await expect(useOnlineStore.getState().register('Bob', 'b@test.com', 'pass')).rejects.toThrow();
    expect(useOnlineStore.getState().authError).toBe('Email taken');
  });
});

describe('logout', () => {
  it('clears auth state and disconnects', () => {
    useOnlineStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', username: 'Alice', email: 'a@test.com' } as any,
      token: 'tok',
      isConnected: true,
      onlinePhase: 'menu',
      isOnlineFlow: true,
    });

    useOnlineStore.getState().logout();

    const s = useOnlineStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.isConnected).toBe(false);
    expect(s.onlinePhase).toBe('auth');
    expect(s.isOnlineFlow).toBe(false);
    expect(clearToken).toHaveBeenCalled();
    expect(mockWsService.disconnect).toHaveBeenCalled();
  });
});

describe('clearAuthError', () => {
  it('clears authError', () => {
    useOnlineStore.setState({ authError: 'some error' });
    useOnlineStore.getState().clearAuthError();
    expect(useOnlineStore.getState().authError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase management
// ---------------------------------------------------------------------------
describe('setOnlinePhase', () => {
  it('changes onlinePhase and sets isOnlineFlow', () => {
    useOnlineStore.getState().setOnlinePhase('room-browser');
    const s = useOnlineStore.getState();
    expect(s.onlinePhase).toBe('room-browser');
    expect(s.isOnlineFlow).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Queue actions
// ---------------------------------------------------------------------------
describe('joinQuickPlay', () => {
  it('calls wsService.joinQueue and sets phase', () => {
    useOnlineStore.getState().joinQuickPlay('classic', 4, false);

    expect(mockWsService.joinQueue).toHaveBeenCalledWith({
      mode: 'classic',
      connectN: 4,
      allowBots: false,
    });
    expect(useOnlineStore.getState().onlinePhase).toBe('quickplay-queue');
  });
});

describe('leaveQueue', () => {
  it('calls wsService.leaveQueue and resets queue state', () => {
    useOnlineStore.setState({ isInQueue: true, queuePosition: 5, onlinePhase: 'quickplay-queue' });

    useOnlineStore.getState().leaveQueue();

    expect(mockWsService.leaveQueue).toHaveBeenCalled();
    const s = useOnlineStore.getState();
    expect(s.isInQueue).toBe(false);
    expect(s.queuePosition).toBe(0);
    expect(s.onlinePhase).toBe('menu');
  });
});

// ---------------------------------------------------------------------------
// Room actions
// ---------------------------------------------------------------------------
describe('createRoom', () => {
  it('calls wsService.createRoom', () => {
    const opts = {
      name: 'Test Room',
      maxPlayers: 2 as const,
      mode: 'classic' as const,
      connectN: 4 as const,
      isPublic: true,
      totalRounds: 3,
    };
    useOnlineStore.getState().createRoom(opts);
    expect(mockWsService.createRoom).toHaveBeenCalledWith(opts);
  });
});

describe('joinRoom', () => {
  it('calls wsService.joinRoom with roomId and inviteCode', () => {
    useOnlineStore.getState().joinRoom('room-1', 'ABC123');
    expect(mockWsService.joinRoom).toHaveBeenCalledWith({ roomId: 'room-1', inviteCode: 'ABC123' });
  });
});

describe('leaveRoom', () => {
  it('clears room state and sets phase to room-browser', () => {
    useOnlineStore.setState({
      currentRoom: { roomId: 'r1', inviteCode: 'X', name: 'Room', hostId: 'h', players: [], config: {} as any },
      onlinePhase: 'room-lobby',
    });

    useOnlineStore.getState().leaveRoom();

    expect(mockWsService.leaveRoom).toHaveBeenCalled();
    expect(useOnlineStore.getState().currentRoom).toBeNull();
    expect(useOnlineStore.getState().onlinePhase).toBe('room-browser');
  });
});

describe('selectColor', () => {
  it('calls wsService.selectColor', () => {
    useOnlineStore.getState().selectColor('#FF0000');
    expect(mockWsService.selectColor).toHaveBeenCalledWith({ color: '#FF0000' });
  });
});

describe('startRoom', () => {
  it('calls wsService.roomStart', () => {
    useOnlineStore.getState().startRoom();
    expect(mockWsService.roomStart).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Match actions
// ---------------------------------------------------------------------------
describe('submitMove', () => {
  it('calls wsService.submitMove', () => {
    useOnlineStore.getState().submitMove(3);
    expect(mockWsService.submitMove).toHaveBeenCalledWith({ col: 3 });
  });
});

describe('requestRematch', () => {
  it('calls wsService.requestRematch', () => {
    useOnlineStore.getState().requestRematch();
    expect(mockWsService.requestRematch).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Socket event handling
// ---------------------------------------------------------------------------
describe('socket events', () => {
  beforeEach(() => {
    // Trigger wireEvents by calling connectWebSocket
    useOnlineStore.setState({ token: 'tok' });
    useOnlineStore.getState().connectWebSocket();
  });

  it('connect event sets isConnected', () => {
    emitMockEvent('connect');
    expect(useOnlineStore.getState().isConnected).toBe(true);
  });

  it('disconnect event clears isConnected', () => {
    useOnlineStore.setState({ isConnected: true });
    emitMockEvent('disconnect');
    expect(useOnlineStore.getState().isConnected).toBe(false);
  });

  it('queue_joined sets queue state', () => {
    emitMockEvent('queue_joined', { position: 3 });
    const s = useOnlineStore.getState();
    expect(s.isInQueue).toBe(true);
    expect(s.queuePosition).toBe(3);
  });

  it('queue_update updates position', () => {
    emitMockEvent('queue_update', { position: 7 });
    expect(useOnlineStore.getState().queuePosition).toBe(7);
  });

  it('room_created sets room state and phase', () => {
    useOnlineStore.setState({ user: { id: 'u1', username: 'Alice' } as any });
    emitMockEvent('room_created', { roomId: 'room-1', inviteCode: 'ABC' });

    const s = useOnlineStore.getState();
    expect(s.currentRoom).not.toBeNull();
    expect(s.currentRoom!.roomId).toBe('room-1');
    expect(s.currentRoom!.inviteCode).toBe('ABC');
    expect(s.onlinePhase).toBe('room-lobby');
  });

  it('room_update updates room state', () => {
    useOnlineStore.setState({
      currentRoom: { roomId: 'r1', inviteCode: 'X', name: '', hostId: '', players: [], config: {} as any },
    });
    const players = [{ id: 'u1', name: 'Alice', color: '#f00', isBot: false, rating: 1000 }];
    const config = { mode: 'classic', connectN: 4, totalRounds: 3, rows: 6, cols: 7, maxPlayers: 2, isPublic: true, name: 'Room' };

    emitMockEvent('room_update', { roomId: 'r1', players, hostId: 'u1', config });

    const room = useOnlineStore.getState().currentRoom!;
    expect(room.players).toEqual(players);
    expect(room.hostId).toBe('u1');
    expect(room.config).toEqual(config);
  });

  it('room_closed clears room and returns to menu', () => {
    useOnlineStore.setState({
      currentRoom: { roomId: 'r1' } as any,
      onlinePhase: 'room-lobby',
    });
    emitMockEvent('room_closed', { reason: 'Host left' });

    expect(useOnlineStore.getState().currentRoom).toBeNull();
    expect(useOnlineStore.getState().onlinePhase).toBe('menu');
  });

  it('match_started creates onlineMatch and sets phase', () => {
    useOnlineStore.setState({ user: { id: 'u1', username: 'Alice' } as any });
    const config = { mode: 'classic', connectN: 4, totalRounds: 3, rows: 6, cols: 7 };
    emitMockEvent('match_started', {
      matchId: 'm1',
      board: [[0, 0], [0, 0]],
      turnOrder: ['u1', 'u2'],
      currentTurn: 'u1',
      config,
    });

    const s = useOnlineStore.getState();
    expect(s.onlinePhase).toBe('online-playing');
    expect(s.onlineMatch).not.toBeNull();
    expect(s.onlineMatch!.matchId).toBe('m1');
    expect(s.onlineMatch!.currentTurn).toBe('u1');
    expect(s.onlineMatch!.myPlayerId).toBe('u1');
  });

  it('state_update updates board and turn', () => {
    useOnlineStore.setState({
      onlineMatch: {
        matchId: 'm1', board: [[0, 0]], currentTurn: 'u1', myPlayerId: 'u1',
        players: [], scores: {}, round: 1, totalRounds: 3,
        config: {} as any, winner: null, isDraw: false, lastMove: null,
        disconnectedPlayers: [], ratingChanges: {}, rematchVotes: [],
      },
    });

    emitMockEvent('state_update', {
      board: [[0, 1]],
      currentTurn: 'u2',
      lastMove: { row: 0, col: 1, playerId: 'u1' },
      scores: { u1: 0, u2: 0 },
    });

    const match = useOnlineStore.getState().onlineMatch!;
    expect(match.board).toEqual([[0, 1]]);
    expect(match.currentTurn).toBe('u2');
    expect(match.lastMove).toEqual({ row: 0, col: 1, playerId: 'u1' });
  });

  it('round_end updates match state and phase', () => {
    useOnlineStore.setState({
      onlineMatch: {
        matchId: 'm1', board: [[0]], currentTurn: 'u1', myPlayerId: 'u1',
        players: [], scores: { u1: 0, u2: 0 }, round: 1, totalRounds: 3,
        config: {} as any, winner: null, isDraw: false, lastMove: null,
        disconnectedPlayers: [], ratingChanges: {}, rematchVotes: [],
      },
    });

    emitMockEvent('round_end', {
      roundNumber: 1,
      winner: 'u1',
      isDraw: false,
      scores: { u1: 1, u2: 0 },
      board: [[1]],
    });

    const s = useOnlineStore.getState();
    expect(s.onlinePhase).toBe('online-round-end');
    expect(s.onlineMatch!.winner).toBe('u1');
    expect(s.onlineMatch!.scores.u1).toBe(1);
  });

  it('match_end updates match state and phase', () => {
    useOnlineStore.setState({
      onlineMatch: {
        matchId: 'm1', board: [[0]], currentTurn: 'u1', myPlayerId: 'u1',
        players: [], scores: { u1: 2, u2: 1 }, round: 3, totalRounds: 3,
        config: {} as any, winner: null, isDraw: false, lastMove: null,
        disconnectedPlayers: [], ratingChanges: {}, rematchVotes: [],
      },
    });

    emitMockEvent('match_end', {
      winner: 'u1',
      finalScores: { u1: 2, u2: 1 },
      ratingChanges: { u1: 15, u2: -15 },
    });

    const s = useOnlineStore.getState();
    expect(s.onlinePhase).toBe('online-match-end');
    expect(s.onlineMatch!.winner).toBe('u1');
    expect(s.onlineMatch!.ratingChanges).toEqual({ u1: 15, u2: -15 });
  });

  it('player_disconnected adds to disconnectedPlayers', () => {
    useOnlineStore.setState({
      onlineMatch: {
        matchId: 'm1', board: [[0]], currentTurn: 'u1', myPlayerId: 'u1',
        players: [], scores: {}, round: 1, totalRounds: 3,
        config: {} as any, winner: null, isDraw: false, lastMove: null,
        disconnectedPlayers: [], ratingChanges: {}, rematchVotes: [],
      },
    });

    emitMockEvent('player_disconnected', { playerId: 'u2', timeout: 60 });

    expect(useOnlineStore.getState().onlineMatch!.disconnectedPlayers).toContain('u2');
  });

  it('player_reconnected removes from disconnectedPlayers', () => {
    useOnlineStore.setState({
      onlineMatch: {
        matchId: 'm1', board: [[0]], currentTurn: 'u1', myPlayerId: 'u1',
        players: [], scores: {}, round: 1, totalRounds: 3,
        config: {} as any, winner: null, isDraw: false, lastMove: null,
        disconnectedPlayers: ['u2'], ratingChanges: {}, rematchVotes: [],
      },
    });

    emitMockEvent('player_reconnected', { playerId: 'u2' });

    expect(useOnlineStore.getState().onlineMatch!.disconnectedPlayers).not.toContain('u2');
  });

  it('match_found from queue sets up match', () => {
    useOnlineStore.setState({
      user: { id: 'u1', username: 'Alice' } as any,
      isInQueue: true,
      onlinePhase: 'quickplay-queue',
    });

    const players = [
      { id: 'u1', name: 'Alice', color: '#f00', isBot: false, rating: 1000 },
      { id: 'u2', name: 'Bob', color: '#00f', isBot: false, rating: 1000 },
    ];
    const config = { mode: 'classic', connectN: 4, totalRounds: 3, rows: 6, cols: 7 };

    emitMockEvent('match_found', { matchId: 'm1', players, config });

    const s = useOnlineStore.getState();
    expect(s.isInQueue).toBe(false);
    expect(s.onlinePhase).toBe('online-playing');
    expect(s.onlineMatch).not.toBeNull();
    expect(s.onlineMatch!.players).toEqual(players);
  });
});
