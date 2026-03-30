const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TOKEN_KEY = 'connectx_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  preferredColor: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

interface RoomsResponse {
  rooms: Array<{
    id: string;
    name: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    mode: string;
    connectN: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

interface LeaderboardResponse {
  entries: Array<{
    userId: string;
    username: string;
    rating: number;
    wins: number;
    losses: number;
    rank: number;
  }>;
}

interface StatsResponse {
  stats: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
}

export const api = {
  register(username: string, email: string, password: string): Promise<AuthResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  getPublicRooms(page = 1, limit = 20): Promise<RoomsResponse> {
    return request(`/rooms/public?page=${page}&limit=${limit}`);
  },

  getLeaderboard(page = 1, limit = 20): Promise<LeaderboardResponse> {
    return request(`/leaderboard/global?page=${page}&limit=${limit}`);
  },

  getPlayerStats(userId: string): Promise<StatsResponse> {
    return request(`/leaderboard/stats/${encodeURIComponent(userId)}`);
  },

  reportPlayer(reportedId: string, reason: string, matchId?: string, details?: string): Promise<void> {
    return request('/moderation/report', {
      method: 'POST',
      body: JSON.stringify({ reportedId, reason, matchId, details }),
    });
  },

  blockPlayer(blockedId: string): Promise<void> {
    return request('/moderation/block', {
      method: 'POST',
      body: JSON.stringify({ blockedId }),
    });
  },
};
