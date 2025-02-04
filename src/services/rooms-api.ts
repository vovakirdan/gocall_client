import { RoomInvite } from "../types";
import { API_BASE_URL, headers } from "./api";

// Функция для получения списка приглашений в комнаты (GET /api/rooms/invites)
export async function fetchRoomInvites(token: string): Promise<RoomInvite[]> {
  const response = await fetch(`${API_BASE_URL}/rooms/invites`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch room invites");
  }
  const data = await response.json();
  return data.invites; // сервер должен вернуть { invites: [...] }
}

// Функция для принятия приглашения в комнату (POST /api/rooms/invite/accept)
export async function acceptRoomInvite(inviteId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/invite/accept`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ invite_id: inviteId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to accept room invite");
  }
}

// Функция для отклонения приглашения в комнату (POST /api/rooms/invite/decline)
export async function declineRoomInvite(inviteId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/invite/decline`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ invite_id: inviteId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to decline room invite");
  }
}

/** Получаем комнаты, где вы являетесь создателем (GET /rooms/mine) */
export async function fetchMyRooms(token: string): Promise<import("../types").Room[]> {
  const response = await fetch(`${API_BASE_URL}/rooms/mine`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }
  const data = await response.json();
  return data.rooms as import("../types").Room[];
}

/** Создание комнаты (POST /rooms/create) */
export async function createRoom(name: string, token: string): Promise<import("../types").Room> {
  const type = "public"; // можно расширить по необходимости
  const password = "";
  const response = await fetch(`${API_BASE_URL}/rooms/create`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, type, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create room");
  }
  const data = await response.json();
  return {
    RoomID: data.roomID,
    Name: data.name,
    Type: data.type,
    UserID: data.userID,
    CreatedAt: new Date().toISOString(),
  };
}

/** Удаление комнаты (DELETE /rooms/:id) */
export async function deleteRoom(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to delete room");
  }
}

/** Получаем приглашённые комнаты (GET /rooms/invites) */
export async function fetchInvitedRooms(token: string): Promise<import("../types").Room[]> {
  const response = await fetch(`${API_BASE_URL}/rooms/invites`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(errorResponse.error || "Failed to fetch invited rooms");
  }
  const data = await response.json();
  return data.invites as import("../types").Room[];
}

/** Приглашение друга в комнату (POST /rooms/invite) */
export async function inviteFriendToRoom(
  roomID: string,
  username: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/invite`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ roomID, username }),
  });
  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(errorResponse.error || "Failed to invite friend to room");
  }
}

/** Обновление комнаты (PUT /rooms/:id) */
export async function updateRoom(roomID: string, name: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ name, type: "public", password: "" }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update room");
  }
}
