import React, { useState, useEffect, useRef } from "react";
import Button from "../components/Button"; // Простой UI-компонент кнопки
import { Plus, MoreVertical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchMyRooms,
  fetchInvitedRooms,
  createRoom,
  deleteRoom,
  updateRoom,
  inviteFriendToRoom,
} from "../services/rooms-api";
import { fetchFriends } from "../services/friends-api";
import { useNavigate } from "react-router-dom";
import { Room } from "../types";

const RoomsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  // Состояния для комнат, приглашённых комнат, списка друзей
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invitedRooms, setInvitedRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  // Состояние для ввода нового названия комнаты
  const [newRoomName, setNewRoomName] = useState("");
  // Состояния для отображения контекстного меню и модального окна приглашения
  const [activeRoomMenu, setActiveRoomMenu] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalRoom, setInviteModalRoom] = useState<string | null>(null);

  // Загружаем данные (комнаты и друзей) при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        const ownRooms = await fetchMyRooms(token);
        const invited = await fetchInvitedRooms(token);
        const fetchedFriends = await fetchFriends(token);

        // Отмечаем комнаты: свои — isOwner = true, приглашённые — false
        const markedOwnRooms = ownRooms.map((room) => ({ ...room, isOwner: true }));
        const markedInvitedRooms = invited.map((room) => ({ ...room, isOwner: false }));

        setRooms(markedOwnRooms);
        setInvitedRooms(markedInvitedRooms);
        setFriends(fetchedFriends);
      } catch (error) {
        console.error("Error loading rooms and friends:", error);
      }
    };
    loadData();
  }, [token]);

  // Объединяем списки комнат
  const allRooms: Room[] = [...rooms, ...invitedRooms];

  // Функция создания новой комнаты
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !token) return;
    try {
      const newRoom = await createRoom(newRoomName, token);
      // Отмечаем как свою комнату
      newRoom.isOwner = true;
      setRooms((prev) => [...prev, newRoom]);
      setNewRoomName("");
    } catch (error: any) {
      console.error("Failed to create room:", error.message);
    }
  };

  // Функция удаления комнаты
  const handleDeleteRoom = async (roomId: string) => {
    if (!token) return;
    try {
      await deleteRoom(roomId, token);
      setRooms((prev) => prev.filter((room) => room.RoomID !== roomId));
      setInvitedRooms((prev) => prev.filter((room) => room.RoomID !== roomId));
      setActiveRoomMenu(null);
    } catch (error: any) {
      console.error("Failed to delete room:", error.message);
    }
  };

  // Функция редактирования названия комнаты
  const handleEditRoom = async (roomId: string) => {
    if (!token) return;
    const newName = window.prompt("Введите новое название комнаты:");
    if (!newName) return;
    try {
      await updateRoom(roomId, newName, token);
      setRooms((prev) =>
        prev.map((room) => (room.RoomID === roomId ? { ...room, Name: newName } : room))
      );
      setInvitedRooms((prev) =>
        prev.map((room) => (room.RoomID === roomId ? { ...room, Name: newName } : room))
      );
      setActiveRoomMenu(null);
    } catch (error: any) {
      console.error("Failed to update room:", error.message);
    }
  };

  // Функция открытия модального окна для приглашения друга
  const handleInviteFriend = (roomId: string) => {
    setInviteModalRoom(roomId);
    setInviteModalOpen(true);
    setActiveRoomMenu(null);
  };

  // Функция подтверждения приглашения друга (через модальное окно)
  const handleConfirmInvite = async (friend: string) => {
    if (!token || !inviteModalRoom) return;
    try {
      await inviteFriendToRoom(inviteModalRoom, friend, token);
      alert(`Друг ${friend} приглашён в комнату!`);
      setInviteModalOpen(false);
    } catch (error: any) {
      console.error("Failed to invite friend:", error.message);
    }
  };

  // Функция присоединения к комнате (навигация к RoomPage)
  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  // Переключение отображения контекстного меню для комнаты
  const toggleContextMenu = (roomId: string) => {
    setActiveRoomMenu((prev) => (prev === roomId ? null : roomId));
  };

  // Закрытие контекстного меню при клике вне его области
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveRoomMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Комнаты</h1>

      {/* Секция создания комнаты */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Название новой комнаты"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <Button variant="primary" onClick={handleCreateRoom}>
          <Plus className="h-4 w-4 mr-2" />
          Создать
        </Button>
      </div>

      {/* Отображение списка комнат */}
      {allRooms.length === 0 ? (
        <p className="text-gray-500">
          Нет комнат. Создайте новую комнату или ждите приглашения.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allRooms.map((room) => (
            <div
              key={room.RoomID}
              className={`relative p-4 rounded-lg shadow ${
                room.isOwner ? "border-2 border-blue-500" : "border-2 border-green-500"
              }`}
            >
              <div className="mb-2">
                <h3 className="font-medium">{room.Name}</h3>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleJoinRoom(room.RoomID)}
                >
                  Присоединиться
                </Button>
                <button onClick={() => toggleContextMenu(room.RoomID)}>
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              {/* Контекстное меню быстрых действий */}
              {activeRoomMenu === room.RoomID && (
                <div
                  ref={menuRef}
                  className="absolute right-2 top-10 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-md z-10 p-2"
                >
                  {room.isOwner ? (
                    <>
                      <button
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded"
                        onClick={() => handleDeleteRoom(room.RoomID)}
                      >
                        <span>Удалить комнату</span>
                      </button>
                      <button
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded"
                        onClick={() => handleEditRoom(room.RoomID)}
                      >
                        <span>Редактировать название</span>
                      </button>
                      <button
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded"
                        onClick={() => handleInviteFriend(room.RoomID)}
                      >
                        <span>Пригласить друга</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded"
                        onClick={() => handleInviteFriend(room.RoomID)}
                      >
                        <span>Пригласить друга</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для приглашения друга */}
      {inviteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Полупрозрачный фон */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setInviteModalOpen(false)}
          ></div>
          <div className="bg-white p-4 rounded-lg z-10 w-80">
            <h3 className="text-lg font-bold mb-4">Пригласить друга</h3>
            {friends.length === 0 ? (
              <p>Нет друзей для приглашения</p>
            ) : (
              <ul>
                {friends.map((friend) => (
                  <li
                    key={friend}
                    className="flex justify-between items-center p-2 hover:bg-gray-100 rounded"
                  >
                    <span>{friend}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirmInvite(friend)}
                    >
                      Пригласить
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setInviteModalOpen(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsPage;
