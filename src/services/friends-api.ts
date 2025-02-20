import { API_BASE_URL, headers } from "./api";
import { FriendRequest, Friend, User } from "../types";

// Функция для получения списка заявок
export async function fetchFriendRequests(token: string): Promise<FriendRequest[]> {
  const response = await fetch(`${API_BASE_URL}/friends/requests`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friend requests");
  }
  const data = await response.json();
  return Array.isArray(data.friend_requests) ? data.friend_requests : []; // предполагается, что сервер вернёт { requests: [...] }
}

// Функция для принятия заявки
export async function acceptFriendRequest(requestId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/accept`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ request_id: requestId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to accept friend request");
  }
}

// Функция для отклонения заявки
export async function declineFriendRequest(requestId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/decline`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ request_id: requestId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to decline friend request");
  }
}

// Функция для отправки заявки на дружбу
export async function requestFriend(friendUsername: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/request`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ to_username: friendUsername }),
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

// Функция для поиска пользователей
export async function searchUsers(query: string, token: string): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to search users");
  }
  const data = await response.json();
  return Array.isArray(data.users) ? data.users : [];
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

export async function fetchPinnedFriends(token: string): Promise<Friend[]> {
  const res = await fetch(`${API_BASE_URL}/friends/pinned`, {
    headers: headers(token),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch pinned friends");
  }
  const data = await res.json();
  return Array.isArray(data.pinned_friends) ? data.pinned_friends : [];
}
