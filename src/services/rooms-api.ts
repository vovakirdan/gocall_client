import { RoomInvite, Room } from "../types";
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
  return Array.isArray(data.invites) ? data.invites : []; // сервер должен вернуть { invites: [...] }
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

/** Получаем комнаты пользователя (GET /rooms) */
export async function fetchMyRooms(token: string): Promise<Room[]> {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }
  const data = await response.json();
  return Array.isArray(data.rooms) ? data.rooms : [];
}

/** Создание комнаты (POST /rooms) */
export async function createRoom(name: string, token: string): Promise<Room> {
  const type = "public"; // можно расширить по необходимости
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, type }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create room");
  }
  const data = await response.json();
  return {
    room_id: String(data.id),
    name: data.name,
    type: data.type,
    user_id: String(data.owner_id),
    created_at: data.created_at,
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

/** Получаем приглашённые комнаты - not implemented in WireChat */
export async function fetchInvitedRooms(_token: string): Promise<Room[]> {
  // Room invites not implemented in WireChat server - return empty array
  return [];
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

/** Create or get direct message room with a user (POST /rooms/direct) */
export interface DirectRoomResponse {
  id: number;
  name: string;
  type: string;
  owner_id: number | null;
  created_at: string;
}

export async function getOrCreateDirectRoom(userId: number, token: string): Promise<DirectRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/direct`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create direct room");
  }
  return response.json();
}
