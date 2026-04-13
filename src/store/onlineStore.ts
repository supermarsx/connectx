import { create } from 'zustand';
import { api, getToken, setToken, clearToken } from '../services/api.ts';
import type { User } from '../services/api.ts';
import { wsService } from '../services/ws.ts';
import type { PlayerInfo, MatchConfig, RoomConfig } from '../services/protocol.ts';
import { dropPiece } from '../engine/board.ts';

export type OnlinePhase =
  | 'auth' | 'menu' | 'quickplay-queue' | 'room-browser'
  | 'room-lobby' | 'match-loading' | 'online-playing' | 'online-round-end' | 'online-match-end'
  | 'friends';

export interface RoomState {
  roomId: string;
  inviteCode: string;
  name: string;
  hostId: string;
  players: PlayerInfo[];
  config: RoomConfig;
}

export interface OnlineMatchState {
  matchId: string;
  board: number[][];
  currentTurn: string;
  myPlayerId: string;
  players: PlayerInfo[];
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  config: MatchConfig;
  winner: string | null;
  isDraw: boolean;
  lastMove: { row: number; col: number; playerId: string } | null;
  disconnectedPlayers: string[];
  ratingChanges: Record<string, number>;
  rematchVotes: string[];
  blockedCells: boolean[][];
}

interface OnlineState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isConnected: boolean;
  isInQueue: boolean;
  queuePosition: number;
  currentRoom: RoomState | null;
  onlineMatch: OnlineMatchState | null;
  onlinePhase: OnlinePhase;
  authError: string | null;
  /** True when user has entered the online flow (clicked "Play Online") */
  isOnlineFlow: boolean;
  emotes: Array<{ playerId: string; emoteId: string; timestamp: number }>;
  moveRejected: boolean;
}

interface OnlineActions {
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  connectWebSocket: () => void;
  joinQuickPlay: (mode: 'classic' | 'fullboard', connectN: 4 | 5 | 6, allowBots: boolean) => void;
  leaveQueue: () => void;
  createRoom: (options: {
    name: string; maxPlayers: 2 | 3 | 4; mode: 'classic' | 'fullboard';
    connectN: 4 | 5 | 6; isPublic: boolean; totalRounds: number;
  }) => void;
  joinRoom: (roomId: string, inviteCode?: string) => void;
  leaveRoom: () => void;
  selectColor: (color: string) => void;
  startRoom: () => void;
  submitMove: (col: number) => void;
  requestRematch: () => void;
  setOnlinePhase: (phase: OnlinePhase) => void;
  clearAuthError: () => void;
  sendEmote: (emoteId: string) => void;
}

export type OnlineStore = OnlineState & OnlineActions;

export const useOnlineStore = create<OnlineStore>((set, get) => {
  // Wire socket events
  function wireEvents() {
    // Clean up previous listeners before attaching new ones
    wsService.removeAllListeners();

    wsService.on('connect', () => {
      set({ isConnected: true });
    });

    wsService.on('disconnect', () => {
      set({ isConnected: false });
    });

    wsService.on('queue_joined', (data: { position: number }) => {
      set({ isInQueue: true, queuePosition: data.position });
    });

    wsService.on('queue_update', (data: { position: number }) => {
      set({ queuePosition: data.position });
    });

    wsService.on('match_found', (data: { matchId: string; players: PlayerInfo[]; config: MatchConfig }) => {
      const { user } = get();
      set({
        isInQueue: false,
        onlineMatch: {
          matchId: data.matchId,
          board: [],
          currentTurn: '',
          myPlayerId: user?.id ?? '',
          players: data.players,
          scores: {},
          round: 1,
          totalRounds: data.config.totalRounds,
          config: data.config,
          winner: null,
          isDraw: false,
          lastMove: null,
          disconnectedPlayers: [],
          ratingChanges: {},
          rematchVotes: [],
          blockedCells: [],
        },
        onlinePhase: 'match-loading',
      });
    });

    wsService.on('room_created', (data: { roomId: string; inviteCode: string }) => {
      const { user } = get();
      set({
        currentRoom: {
          roomId: data.roomId,
          inviteCode: data.inviteCode,
          name: '',
          hostId: user?.id ?? '',
          players: [],
          config: { mode: 'classic', connectN: 4, totalRounds: 3, rows: 6, cols: 7, maxPlayers: 2, isPublic: true, name: '' },
        },
        onlinePhase: 'room-lobby',
      });
    });

    wsService.on('room_update', (data: { roomId: string; players: PlayerInfo[]; hostId: string; config: RoomConfig }) => {
      set({
        currentRoom: {
          roomId: data.roomId,
          inviteCode: get().currentRoom?.inviteCode ?? '',
          name: data.config.name,
          hostId: data.hostId,
          players: data.players,
          config: data.config,
        },
      });
    });

    wsService.on('room_closed', () => {
      set({ currentRoom: null, onlinePhase: 'menu' });
    });

    wsService.on('match_started', (data: { matchId: string; board: number[][]; turnOrder: string[]; currentTurn: string; config: MatchConfig }) => {
      const { user, onlineMatch } = get();
      const players = onlineMatch?.players ?? get().currentRoom?.players ?? [];
      const scores: Record<string, number> = {};
      players.forEach(p => { scores[p.id] = 0; });
      set({
        onlineMatch: {
          matchId: data.matchId,
          board: data.board,
          currentTurn: data.currentTurn,
          myPlayerId: user?.id ?? '',
          players,
          scores,
          round: 1,
          totalRounds: data.config.totalRounds,
          config: data.config,
          winner: null,
          isDraw: false,
          lastMove: null,
          disconnectedPlayers: [],
          ratingChanges: {},
          rematchVotes: [],
          blockedCells: Array.from({ length: data.config.rows }, () =>
            Array.from({ length: data.config.cols }, () => false)
          ),
        },
        onlinePhase: 'online-playing',
      });
    });

    wsService.on('state_update', (data: { board: number[][]; currentTurn: string; lastMove: { row: number; col: number; playerId: string }; scores: Record<string, number>; blockedCells?: boolean[][] }) => {
      const match = get().onlineMatch;
      if (!match) return;
      boardSnapshot = null;
      currentTurnSnapshot = null;
      set({
        onlineMatch: {
          ...match,
          board: data.board,
          currentTurn: data.currentTurn,
          lastMove: data.lastMove,
          scores: data.scores,
          blockedCells: data.blockedCells ?? match.blockedCells,
        },
      });
    });

    wsService.on('move_rejected', () => {
      const match = get().onlineMatch;
      if (!match || !boardSnapshot) return;
      set({
        onlineMatch: {
          ...match,
          board: boardSnapshot,
          currentTurn: currentTurnSnapshot ?? match.currentTurn,
        },
        moveRejected: true,
      });
      boardSnapshot = null;
      currentTurnSnapshot = null;
      if (moveRejectedTimer) clearTimeout(moveRejectedTimer);
      moveRejectedTimer = setTimeout(() => { set({ moveRejected: false }); moveRejectedTimer = null; }, 2000);
    });

    wsService.on('round_end', (data: { roundNumber: number; winner: string | null; isDraw: boolean; scores: Record<string, number>; board: number[][]; blockedCells?: boolean[][] }) => {
      const match = get().onlineMatch;
      if (!match) return;
      set({
        onlineMatch: {
          ...match,
          board: data.board,
          scores: data.scores,
          winner: data.winner,
          isDraw: data.isDraw,
          round: data.roundNumber,
          blockedCells: data.blockedCells ?? match.blockedCells,
        },
        onlinePhase: 'online-round-end',
      });
    });

    wsService.on('match_end', (data: { winner: string | null; finalScores: Record<string, number>; ratingChanges: Record<string, number> }) => {
      const match = get().onlineMatch;
      if (!match) return;
      set({
        onlineMatch: {
          ...match,
          winner: data.winner,
          scores: data.finalScores,
          ratingChanges: data.ratingChanges,
        },
        onlinePhase: 'online-match-end',
      });
    });

    wsService.on('player_disconnected', (data: { playerId: string }) => {
      const match = get().onlineMatch;
      if (!match) return;
      set({
        onlineMatch: {
          ...match,
          disconnectedPlayers: [...match.disconnectedPlayers, data.playerId],
        },
      });
    });

    wsService.on('player_reconnected', (data: { playerId: string }) => {
      const match = get().onlineMatch;
      if (!match) return;
      set({
        onlineMatch: {
          ...match,
          disconnectedPlayers: match.disconnectedPlayers.filter(id => id !== data.playerId),
        },
      });
    });

    wsService.on('error', (data: { code: string; message: string }) => {
      console.error(`[Online] ${data.code}: ${data.message}`);
    });

    wsService.on('chat_emote', (data: { playerId: string; emoteId: string }) => {
      const now = Date.now();
      const current = get().emotes.filter(e => now - e.timestamp < 3000);
      set({ emotes: [...current, { playerId: data.playerId, emoteId: data.emoteId, timestamp: now }] });
    });
  }

  let eventsWired = false;
  let boardSnapshot: number[][] | null = null;
  let currentTurnSnapshot: string | null = null;
  let moveRejectedTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    // State
    isAuthenticated: false,
    user: null,
    token: getToken(),
    isConnected: false,
    isInQueue: false,
    queuePosition: 0,
    currentRoom: null,
    onlineMatch: null,
    onlinePhase: (sessionStorage.getItem('connectx-online-flow') === 'true'
      ? (sessionStorage.getItem('connectx-online-phase') as OnlinePhase ?? 'menu')
      : 'auth') as OnlinePhase,
    authError: null,
    isOnlineFlow: sessionStorage.getItem('connectx-online-flow') === 'true',
    emotes: [],
    moveRejected: false,

    // Actions
    async login(email: string, password: string) {
      try {
        set({ authError: null });
        const { token, user } = await api.login(email, password);
        setToken(token);
        set({ isAuthenticated: true, user, token, onlinePhase: 'menu' });
        get().connectWebSocket();
      } catch (err: unknown) {
        set({ authError: err instanceof Error ? err.message : 'Login failed' });
        throw err;
      }
    },

    async register(username: string, email: string, password: string) {
      try {
        set({ authError: null });
        const { token, user } = await api.register(username, email, password);
        setToken(token);
        set({ isAuthenticated: true, user, token, onlinePhase: 'menu' });
        get().connectWebSocket();
      } catch (err: unknown) {
        set({ authError: err instanceof Error ? err.message : 'Registration failed' });
        throw err;
      }
    },

    logout() {
      clearToken();
      wsService.disconnect();
      eventsWired = false;
      sessionStorage.removeItem('connectx-online-flow');
      sessionStorage.removeItem('connectx-online-phase');
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isConnected: false,
        isInQueue: false,
        currentRoom: null,
        onlineMatch: null,
        onlinePhase: 'auth',
        isOnlineFlow: false,
      });
    },

    async checkAuth() {
      const token = getToken();
      if (!token) return;
      try {
        const { user } = await api.getMe();
        set({ isAuthenticated: true, user, token });
        get().connectWebSocket();
      } catch {
        clearToken();
        set({ isAuthenticated: false, user: null, token: null });
      }
    },

    connectWebSocket() {
      const { token } = get();
      if (!token) return;
      if (!eventsWired) {
        wireEvents();
        eventsWired = true;
      }
      wsService.connect(token);
    },

    joinQuickPlay(mode, connectN, allowBots) {
      wsService.joinQueue({ mode, connectN, allowBots });
      set({ onlinePhase: 'quickplay-queue' });
    },

    leaveQueue() {
      wsService.leaveQueue();
      set({ isInQueue: false, queuePosition: 0, onlinePhase: 'menu' });
    },

    createRoom(options) {
      wsService.createRoom(options);
    },

    joinRoom(roomId, inviteCode) {
      wsService.joinRoom({ roomId, inviteCode });
    },

    leaveRoom() {
      wsService.leaveRoom();
      set({ currentRoom: null, onlinePhase: 'room-browser' });
    },

    selectColor(color) {
      wsService.selectColor({ color });
    },

    startRoom() {
      wsService.roomStart();
    },

    submitMove(col) {
      // Optimistic local update: apply move immediately for responsive feel
      const match = get().onlineMatch;
      if (match) {
        if (match.currentTurn !== match.myPlayerId) return;
        const playerIndex = match.players.findIndex(p => p.id === match.myPlayerId);
        if (playerIndex !== -1) {
          const enginePlayerId = playerIndex + 1;
          // Save snapshot for rollback if server rejects the move
          boardSnapshot = match.board.map(row => [...row]);
          currentTurnSnapshot = match.currentTurn;
          const result = dropPiece(match.board, col, enginePlayerId);
          if (!result) return; // Don't send invalid move to server
          set({
            onlineMatch: {
              ...match,
              board: result.board,
              lastMove: { row: result.row, col, playerId: match.myPlayerId },
            },
          });
          wsService.submitMove({ col });
        }
      }
    },

    requestRematch() {
      wsService.requestRematch();
    },

    setOnlinePhase(phase) {
      sessionStorage.setItem('connectx-online-flow', 'true');
      sessionStorage.setItem('connectx-online-phase', phase);
      set({ onlinePhase: phase, isOnlineFlow: true });
    },

    clearAuthError() {
      set({ authError: null });
    },

    sendEmote(emoteId: string) {
      wsService.chatEmote({ emoteId });
      // Also show own emote locally
      const { user, emotes } = get();
      if (user) {
        const now = Date.now();
        const current = emotes.filter(e => now - e.timestamp < 3000);
        set({ emotes: [...current, { playerId: user.id, emoteId, timestamp: now }] });
      }
    },
  };
});
