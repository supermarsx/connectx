import { query, getDb } from "../db/provider.js";

export interface FriendInfo {
  userId: string;
  username: string;
  rating: number;
  isOnline: boolean;
}

export interface PendingRequest {
  userId: string;
  username: string;
  createdAt: string;
}

/**
 * Send a friend request. Creates a row with status='pending'.
 * Prevents self-add and duplicate/blocked requests.
 */
export async function sendFriendRequest(
  userId: string,
  friendId: string,
): Promise<{ success: boolean; error?: string }> {
  if (userId === friendId) {
    return { success: false, error: "Cannot send a friend request to yourself" };
  }

  // Check if blocked
  const blocked = await query(
    "SELECT 1 FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)",
    [userId, friendId],
  );
  if (blocked.rows.length > 0) {
    return { success: false, error: "Cannot send friend request" };
  }

  // Check if already friends or pending
  const existing = await query(
    "SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2",
    [userId, friendId],
  );
  if (existing.rows.length > 0) {
    const status = (existing.rows[0] as { status: string }).status;
    if (status === "accepted") {
      return { success: false, error: "Already friends" };
    }
    return { success: false, error: "Friend request already pending" };
  }

  // Check if the other user already sent us a request (auto-accept)
  const reverse = await query(
    "SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2",
    [friendId, userId],
  );
  if (reverse.rows.length > 0) {
    const status = (reverse.rows[0] as { status: string }).status;
    if (status === "pending") {
      // Auto-accept: update existing + insert reciprocal
      await query(
        "UPDATE friendships SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2",
        [friendId, userId],
      );
      await query(
        "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'accepted')",
        [userId, friendId],
      );
      return { success: true };
    }
    if (status === "accepted") {
      return { success: false, error: "Already friends" };
    }
  }

  // Verify target user exists
  const targetUser = await query("SELECT id FROM users WHERE id = $1", [friendId]);
  if (targetUser.rows.length === 0) {
    return { success: false, error: "User not found" };
  }

  await query(
    "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')",
    [userId, friendId],
  );

  return { success: true };
}

/**
 * Accept a pending friend request. Updates status to 'accepted' and creates reciprocal row.
 */
export async function acceptFriendRequest(
  userId: string,
  requesterId: string,
): Promise<{ success: boolean; error?: string }> {
  const existing = await query(
    "SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'",
    [requesterId, userId],
  );
  if (existing.rows.length === 0) {
    return { success: false, error: "No pending friend request found" };
  }

  await query(
    "UPDATE friendships SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2",
    [requesterId, userId],
  );
  await query(
    "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'",
    [userId, requesterId],
  );

  return { success: true };
}

/**
 * Decline a pending friend request. Deletes the pending row.
 */
export async function declineFriendRequest(
  userId: string,
  requesterId: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await query(
    "DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'",
    [requesterId, userId],
  );
  if (result.rowCount === 0) {
    return { success: false, error: "No pending friend request found" };
  }
  return { success: true };
}

/**
 * Remove an existing friendship. Deletes rows in both directions.
 */
export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<{ success: boolean; error?: string }> {
  await getDb().transaction(async (txQuery) => {
    await txQuery("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [userId, friendId]);
    await txQuery("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [friendId, userId]);
  });
  return { success: true };
}

/**
 * Get all accepted friends with username, rating.
 * Online status is determined by the caller (route layer) using connectionManager.
 */
export async function getFriends(
  userId: string,
): Promise<FriendInfo[]> {
  const result = await query(
    `SELECT u.id AS "userId", u.username, u.rating
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1 AND f.status = 'accepted'
     ORDER BY u.username`,
    [userId],
  );

  return result.rows.map((r) => {
    const row = r as { userId: string; username: string; rating: number };
    return {
      userId: row.userId,
      username: row.username,
      rating: row.rating,
      isOnline: false, // populated by the route layer
    };
  });
}

/**
 * Get incoming pending friend requests.
 */
export async function getPendingRequests(
  userId: string,
): Promise<PendingRequest[]> {
  const result = await query(
    `SELECT u.id AS "userId", u.username, f.created_at AS "createdAt"
     FROM friendships f
     JOIN users u ON u.id = f.user_id
     WHERE f.friend_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId],
  );

  return result.rows as unknown as PendingRequest[];
}

/**
 * Check if two users are friends (accepted).
 */
export async function areFriends(
  userId: string,
  friendId: string,
): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'accepted'",
    [userId, friendId],
  );
  return result.rows.length > 0;
}
