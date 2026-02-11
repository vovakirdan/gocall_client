import { RoomInvite, Room } from "../types";
import { headers } from "./api";
import { API_BASE_URL } from "./config";

// Функция для получения списка приглашений в комнаты (GET /api/rooms/invites)
export async function fetchRoomInvites(token: string): Promise<RoomInvite[]> {
  void token;
  return [];
}

// Функция для принятия приглашения в комнату (POST /api/rooms/invite/accept)
export async function acceptRoomInvite(inviteId: number, token: string): Promise<void> {
  void inviteId;
  void token;
  throw new Error("Room invites are not implemented on this server");
}

// Функция для отклонения приглашения в комнату (POST /api/rooms/invite/decline)
export async function declineRoomInvite(inviteId: number, token: string): Promise<void> {
  void inviteId;
  void token;
  throw new Error("Room invites are not implemented on this server");
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
  // Server returns array directly, or { rooms: [...] }
  const rooms = Array.isArray(data) ? data : (Array.isArray(data.rooms) ? data.rooms : []);
  return rooms.map((r: { id: number; name: string; type: string; owner_id: number | null; created_at: string }) => ({
    room_id: String(r.id),
    user_id: r.owner_id ? String(r.owner_id) : '',
    name: r.name,
    type: r.type,
    created_at: r.created_at,
  }));
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
  void roomID;
  void token;
  throw new Error("Room delete endpoint is not implemented on this server");
}

/** Join room as member (POST /rooms/:id/join) - required for calls */
export async function joinRoomAsMember(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/join`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) {
    // Ignore "already a member" errors
    const errorData = await response.json();
    if (!errorData.error?.includes("already")) {
      throw new Error(errorData.error || "Failed to join room");
    }
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
  void roomID;
  void username;
  void token;
  throw new Error("Room invite endpoint is not implemented on this server");
}

/** Обновление комнаты (PUT /rooms/:id) */
export async function updateRoom(roomID: string, name: string, token: string): Promise<void> {
  void roomID;
  void name;
  void token;
  throw new Error("Room update endpoint is not implemented on this server");
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
