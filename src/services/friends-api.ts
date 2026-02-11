import { FriendRequest, Friend, User } from "../types";
import { decodeJWT, headers } from "./api";
import { API_BASE_URL } from "./config";

interface FriendResponse {
  id: number;
  user_id: number;
  friend_id: number;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
  friend_username?: string;
}

const toNumericUserID = (token: string): number => {
  const me = decodeJWT(token);
  return me?.id ?? 0;
};

export async function fetchFriendRequests(token: string): Promise<FriendRequest[]> {
  const response = await fetch(`${API_BASE_URL}/friends/requests/incoming`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friend requests");
  }

  const data = (await response.json()) as FriendResponse[];
  return data.map((item) => ({
    id: item.id,
    from_user_id: String(item.user_id),
    from_username: item.friend_username || `user-${item.user_id}`,
    to_user_id: String(item.friend_id),
    status: item.status === "blocked" ? "declined" : item.status,
    created_at: item.created_at,
  }));
}

export async function acceptFriendRequest(userId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/${userId}/accept`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to accept friend request");
  }
}

export async function declineFriendRequest(userId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/${userId}/reject`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to decline friend request");
  }
}

export async function requestFriend(friendUserId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/requests`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ user_id: friendUserId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to send friend request");
  }
}

export async function fetchFriends(token: string): Promise<Friend[]> {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friends");
  }

  const me = toNumericUserID(token);
  const data = (await response.json()) as FriendResponse[];
  return data.map((item) => {
    const friendUserID = item.user_id === me ? item.friend_id : item.user_id;
    return {
      id: item.id,
      user_id: String(friendUserID),
      friend_user_id: friendUserID,
      username: item.friend_username || `user-${friendUserID}`,
      is_online: false,
      is_pinned: false,
      created_at: item.created_at,
    };
  });
}

export async function addFriend(friendUsername: string, token: string): Promise<void> {
  void friendUsername;
  void token;
  throw new Error("User search/add by username is not implemented on this server");
}

export async function removeFriend(friendUsername: string, token: string): Promise<void> {
  void friendUsername;
  void token;
  throw new Error("Friend remove endpoint is not implemented on this server");
}

export async function searchUsers(_query: string, _token: string): Promise<User[]> {
  return [];
}

export async function pinFriend(friendId: number, token: string): Promise<void> {
  void friendId;
  void token;
  throw new Error("Pin friend is not implemented on this server");
}

export async function unpinFriend(friendId: number, token: string): Promise<void> {
  void friendId;
  void token;
  throw new Error("Unpin friend is not implemented on this server");
}

export async function fetchPinnedFriends(_token: string): Promise<Friend[]> {
  return [];
}
