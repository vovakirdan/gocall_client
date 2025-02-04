import React, { useState, useEffect, useRef } from "react";
import Button from "../components/Button";
import { Plus, Video, MoreVertical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchMyRooms,
  fetchInvitedRooms,
  deleteRoom,
  updateRoom,
  inviteFriendToRoom,
} from "../services/rooms-api";
import { fetchFriends } from "../services/friends-api";
import { Room, Friend } from "../types";

const Index: React.FC = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invitedRooms, setInvitedRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeRoomMenu, setActiveRoomMenu] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalRoom, setInviteModalRoom] = useState<string | null>(null);

  // Загружаем данные: собственные комнаты, приглашённые комнаты и друзей
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        const ownRooms = await fetchMyRooms(token);
        const invited = await fetchInvitedRooms(token);
        const fetchedFriends = await fetchFriends(token);

        // Помечаем, какие комнаты созданы пользователем
        const markedOwnRooms = ownRooms.map((room) => ({ ...room, isOwner: true }));
        const markedInvitedRooms = invited.map((room) => ({ ...room, isOwner: false }));

        setRooms(markedOwnRooms);
        setInvitedRooms(markedInvitedRooms);
        setFriends(fetchedFriends);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    loadData();
  }, [token]);

  const allRooms: Room[] = [...rooms, ...invitedRooms];

  // Удаление комнаты
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

  // Редактирование комнаты (только название)
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

  // Открытие модального окна для приглашения друга в комнату
  const handleInviteFriend = (roomId: string) => {
    setInviteModalRoom(roomId);
    setInviteModalOpen(true);
    setActiveRoomMenu(null);
  };

  // Подтверждение приглашения (в модальном окне)
  const handleConfirmInvite = async (friendName: string) => {
    if (!token || !inviteModalRoom) return;
    try {
      await inviteFriendToRoom(inviteModalRoom, friendName, token);
      alert(`Друг ${friendName} приглашён в комнату!`);
      setInviteModalOpen(false);
    } catch (error: any) {
      console.error("Failed to invite friend:", error.message);
    }
  };

  // Обработка присоединения к комнате (здесь можно расширить логику навигации)
  const handleJoinRoom = (roomId: string) => {
    alert(`Присоединиться к комнате ${roomId}`);
  };

  // Переключение контекстного меню для комнаты
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
    <div className="min-h-screen flex">
      {/* Основной контент */}
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Welcome to VideoChat</h1>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Секция комнат */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Комнаты</h2>
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
                    room.isOwner
                      ? "border-2 border-blue-500"
                      : "border-2 border-green-500"
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
                  {/* Контекстное меню */}
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
        </section>

        {/* Секция друзей */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Друзья</h2>
          {friends && friends.length === 0 ? (
            <p className="text-gray-500">Нет друзей. Добавьте новых друзей!</p>
          ) : (
            <div className="grid gap-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{friend.friendID}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Модальное окно для приглашения друга */}
      {inviteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Полупрозрачный бекграунд */}
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
                    key={friend.id}
                    className="flex justify-between items-center p-2 hover:bg-gray-100 rounded"
                  >
                    <span>{friend.friendID}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirmInvite(friend.friendID)}
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

export default Index;
