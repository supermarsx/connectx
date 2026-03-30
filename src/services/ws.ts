import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './protocol.ts';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

export class WebSocketService {
  private socket: TypedSocket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    // Forward all known server events to registered callbacks
    const serverEvents: (keyof ServerToClientEvents)[] = [
      'queue_joined', 'queue_update', 'match_found',
      'room_created', 'room_update', 'room_closed',
      'color_rejected', 'match_started', 'state_update',
      'move_rejected', 'round_end', 'match_end',
      'player_disconnected', 'player_reconnected', 'error',
    ];

    for (const event of serverEvents) {
      (this.socket as Socket).on(event as string, (data: unknown) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(cb => cb(data));
        }
      });
    }

    this.socket.on('connect', () => {
      const callbacks = this.listeners.get('connect');
      if (callbacks) callbacks.forEach(cb => cb());
    });

    this.socket.on('disconnect', (reason: string) => {
      const callbacks = this.listeners.get('disconnect');
      if (callbacks) callbacks.forEach(cb => cb(reason));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Client event emitters
  joinQueue(data: { mode: 'classic' | 'fullboard'; connectN: 4 | 5 | 6; allowBots: boolean }): void {
    this.socket?.emit('join_queue', data);
  }

  leaveQueue(): void {
    this.socket?.emit('leave_queue', {});
  }

  createRoom(data: {
    name: string; maxPlayers: 2 | 3 | 4; mode: 'classic' | 'fullboard';
    connectN: 4 | 5 | 6; isPublic: boolean; totalRounds: number;
  }): void {
    this.socket?.emit('create_room', data);
  }

  joinRoom(data: { roomId: string; inviteCode?: string }): void {
    this.socket?.emit('join_room', data);
  }

  leaveRoom(): void {
    this.socket?.emit('leave_room', {});
  }

  roomStart(): void {
    this.socket?.emit('room_start', {});
  }

  selectColor(data: { color: string }): void {
    this.socket?.emit('select_color', data);
  }

  submitMove(data: { col: number }): void {
    this.socket?.emit('submit_move', data);
  }

  requestRematch(): void {
    this.socket?.emit('request_rematch', {});
  }

  chatEmote(data: { emoteId: string }): void {
    this.socket?.emit('chat_emote', data);
  }

  // Event subscription
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
}

export const wsService = new WebSocketService();
