// ── Helper Types ──

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  rating: number;
}

export interface MatchConfig {
  mode: "classic" | "fullboard";
  connectN: number;
  totalRounds: number;
  rows: number;
  cols: number;
}

export interface RoomConfig extends MatchConfig {
  maxPlayers: number;
  isPublic: boolean;
  name: string;
}

// ── Client-to-Server Events ──

export interface ClientToServerEvents {
  join_queue: (data: {
    mode: "classic" | "fullboard";
    connectN: 4 | 5 | 6;
    allowBots: boolean;
  }) => void;

  leave_queue: (data: Record<string, never>) => void;

  create_room: (data: {
    name: string;
    maxPlayers: 2 | 3 | 4;
    mode: "classic" | "fullboard";
    connectN: 4 | 5 | 6;
    isPublic: boolean;
    totalRounds: number;
  }) => void;

  join_room: (data: { roomId: string; inviteCode?: string }) => void;

  leave_room: (data: Record<string, never>) => void;

  room_start: (data: Record<string, never>) => void;

  select_color: (data: { color: string }) => void;

  submit_move: (data: { col: number }) => void;

  request_rematch: (data: Record<string, never>) => void;

  chat_emote: (data: { emoteId: string }) => void;
}

// ── Server-to-Client Events ──

export interface ServerToClientEvents {
  queue_joined: (data: { position: number }) => void;

  queue_update: (data: { position: number; estimatedWait: number }) => void;

  match_found: (data: {
    matchId: string;
    players: PlayerInfo[];
    config: MatchConfig;
  }) => void;

  room_created: (data: { roomId: string; inviteCode: string }) => void;

  room_update: (data: {
    roomId: string;
    players: PlayerInfo[];
    hostId: string;
    config: RoomConfig;
  }) => void;

  room_closed: (data: { reason: string }) => void;

  color_rejected: (data: {
    reason: string;
    availableColors: string[];
  }) => void;

  match_started: (data: {
    matchId: string;
    board: number[][];
    turnOrder: string[];
    currentTurn: string;
    config: MatchConfig;
  }) => void;

  state_update: (data: {
    board: number[][];
    currentTurn: string;
    lastMove: { row: number; col: number; playerId: string };
    scores: Record<string, number>;
  }) => void;

  move_rejected: (data: { reason: string }) => void;

  round_end: (data: {
    roundNumber: number;
    winner: string | null;
    isDraw: boolean;
    scores: Record<string, number>;
    board: number[][];
  }) => void;

  match_end: (data: {
    winner: string | null;
    finalScores: Record<string, number>;
    ratingChanges: Record<string, number>;
  }) => void;

  player_disconnected: (data: {
    playerId: string;
    timeout: number;
  }) => void;

  player_reconnected: (data: { playerId: string }) => void;

  error: (data: { code: string; message: string }) => void;
}
