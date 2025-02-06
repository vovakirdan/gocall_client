// на всякий случай зеркалим все типы с бэкенда

export interface User {
  id: number;
  user_id: string;
  username: string;
  name: string;
  email: string;
  is_online: boolean;
  created_at: string;
}

export interface UserInfo {
  id: number;
  username: string;
  name: string;
}

export interface Room {
  room_id: string;
  user_id: string; // можно использовать string (UUID)
  name: string;
  type: string;
  created_at: string;
  is_owner?: boolean;
}

export interface RoomMember {
  id: number;
  room_id: string;
  user_id: string;
  role: "admin" | "member" | "viewer";
  joined_at: string;
}

export interface Friend {
  id: number;
  username: string;
  is_online: boolean;
  user_id: string;
  is_pinned: boolean;
}

export interface FriendRequest {
  id: number;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface RoomInvite {
  id: number;
  room_id: string;
  inviter_user_id: string;
  invited_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}