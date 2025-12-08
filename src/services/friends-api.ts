import { API_BASE_URL, headers } from "./api";
import { FriendRequest, Friend, User } from "../types";

// Функция для получения списка заявок
export async function fetchFriendRequests(token: string): Promise<FriendRequest[]> {
  const response = await fetch(`${API_BASE_URL}/friends/requests/incoming`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friend requests");
  }
  const data = await response.json();
  return Array.isArray(data.requests) ? data.requests : [];
}

// Функция для принятия заявки (POST /friends/:userId/accept)
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

// Функция для отклонения заявки (DELETE /friends/:userId/reject)
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

// Функция для отправки заявки на дружбу (POST /friends/requests)
export async function requestFriend(friendUserId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/requests`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ target_user_id: friendUserId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to send friend request");
  }
}

// Функция для получения списка друзей
export async function fetchFriends(token: string): Promise<Friend[]> {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friends");
  }
  const data = await response.json();
  return Array.isArray(data.friends) ? data.friends : []; // предполагается, что сервер вернёт { friends: [...] }
}

// Функция для добавления друга
export async function addFriend(friendUsername: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/add`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ friend_username: friendUsername }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add friend");
  }
}

// Функция для удаления друга
export async function removeFriend(friendUsername: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/remove`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ friend_username: friendUsername }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to remove friend");
  }
}

// Функция для поиска пользователей - not implemented in WireChat
export async function searchUsers(_query: string, _token: string): Promise<User[]> {
  // User search not implemented in WireChat server - return empty array
  // TODO: Add search endpoint to server or use friend list filtering
  return [];
}

export async function pinFriend(friendId: number, token: string) {
  const res = await fetch(`${API_BASE_URL}/friends/pin`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ friend_id: friendId })
  });
  if (!res.ok) throw new Error("Failed to pin friend");
}

export async function unpinFriend(friendId: number, token: string) {
  const res = await fetch(`${API_BASE_URL}/friends/unpin`, {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify({ friend_id: friendId })
  });
  if (!res.ok) throw new Error("Failed to unpin friend");
}

export async function fetchPinnedFriends(_token: string): Promise<Friend[]> {
  // Pinned friends not implemented in WireChat server - return empty array
  return [];
}
