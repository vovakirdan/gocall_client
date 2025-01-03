import { API_BASE_URL } from "./api";

export async function fetchFriends(token: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/friends`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch friends");
  }

  const data = await response.json();
  return data.friends;
}

export async function addFriend(username: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    throw new Error("Failed to add friend");
  }
}

export async function removeFriend(username: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/friends/remove`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove friend");
  }
}
