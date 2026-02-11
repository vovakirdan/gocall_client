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

/**
 * {
    "id": 11,
    "user_id": "d4a09bd3-f5f9-4e80-b478-117355f934df",
    "username": "testuser",
    "is_pinned": true,
    "created_at": "2025-02-04T16:33:37.705725385+03:00"
}
 */
export interface Friend {
  id: number; // friendship row id
  username: string;
  is_online: boolean;
  user_id: string; // kept for route params compatibility
  friend_user_id: number; // numeric target user id for DM/calls
  is_pinned: boolean;
  created_at: string;
}

export interface FriendRequest {
  id: number;
  from_user_id: string;
  from_username: string;
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

export interface IChatMessageResponse {
  id: number,
  sender_id: string,
  receiver_id: string,
  text: string,
  created_at: string,
}
