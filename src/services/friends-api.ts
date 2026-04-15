import { FriendRequest, Friend, User } from "../types";
import { getUserInfo, headers } from "./api";
import { API_BASE_URL } from "./config";

interface FriendResponse {
  id: number;
  username: string;
  is_online: boolean;
  user_id: string;
  is_pinned: boolean;
  created_at: string;
}

interface FriendRequestResponse {
  id: number;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

// fetchFriendRequests returns pending incoming friend requests for the current user.
export async function fetchFriendRequests(token: string): Promise<FriendRequest[]> {
  const response = await fetch(`${API_BASE_URL}/friends/requests`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friend requests");
  }

  const payload = (await response.json()) as { friend_requests?: FriendRequestResponse[] };
  const requests = payload.friend_requests ?? [];

  const requestsWithUsers = await Promise.all(
    requests.map(async (item) => {
      try {
        const fromUser = await getUserInfo(token, item.from_user_id);
        return {
          item,
          fromUsername: fromUser.username,
        };
      } catch {
        return {
          item,
          fromUsername: `user-${item.from_user_id}`,
        };
      }
    })
  );

  return requestsWithUsers.map(({ item, fromUsername }) => ({
    id: item.id,
    from_user_id: item.from_user_id,
    from_username: fromUsername,
    to_user_id: item.to_user_id,
    status: item.status,
    created_at: item.created_at,
  }));
}

// acceptFriendRequest accepts a pending friend request by numeric request ID.
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

// declineFriendRequest declines a pending friend request by numeric request ID.
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

// requestFriend sends a friend request to another user by username.
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

// fetchFriends returns the current user's accepted friends.
export async function fetchFriends(token: string): Promise<Friend[]> {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friends");
  }

  const data = (await response.json()) as { friends?: FriendResponse[] };
  const friends = data.friends ?? [];

  return friends.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    friend_user_id: item.user_id,
    username: item.username || `user-${item.user_id}`,
    is_online: item.is_online,
    is_pinned: item.is_pinned,
    created_at: item.created_at,
  }));
}

// addFriend creates a friendship directly when the backend supports immediate add flow.
export async function addFriend(friendUsername: string, token: string): Promise<void> {
  return requestFriend(friendUsername, token);
}

// removeFriend deletes a friendship by target username.
export async function removeFriend(friendUsername: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/remove`, {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify({ friend_username: friendUsername }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to remove friend");
  }
}

// searchUsers finds candidate users for the friends UI search flow.
export async function searchUsers(query: string, token: string, signal?: AbortSignal): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: headers(token),
    signal,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to search users");
  }

  const payload = (await response.json()) as { users?: { id: number; username: string; name: string }[] };
  const users = payload.users ?? [];

  return users.map((item) => ({
    id: item.id,
    user_id: String(item.id),
    username: item.username,
    name: item.name,
    email: "", // Not returned by API
    is_online: false, // Not returned by API
    created_at: "", // Not returned by API
  }));
}

// pinFriend marks a friend as pinned in the sidebar.
export async function pinFriend(friendId: number, token: string): Promise<void> {
  void friendId;
  void token;
  throw new Error("Pin friend is not implemented on this server");
}

// unpinFriend removes the pinned flag from a friend.
export async function unpinFriend(friendId: number, token: string): Promise<void> {
  void friendId;
  void token;
  throw new Error("Unpin friend is not implemented on this server");
}

// fetchPinnedFriends returns pinned friends or an empty list when unsupported.
export async function fetchPinnedFriends(_token: string): Promise<Friend[]> {
  return [];
}
