import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import {
  fetchFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  requestFriend,
  fetchFriends,
  addFriend,
  removeFriend,
} from "../services/friends-api";
import { FriendRequest } from "../types";

const FriendsPage: React.FC = () => {
  const { token } = useAuth();
  const [friends, setFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // Заглушка поиска
  const [newFriend, setNewFriend] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [requestUsername, setRequestUsername] = useState("");

  // Загрузка списка друзей
  useEffect(() => {
    const loadFriends = async () => {
      if (!token) return;
      try {
        const friendsData = await fetchFriends(token);
        setFriends(friendsData);
      } catch (err: any) {
        setError(err.message || "Failed to load friends");
      }
    };
    loadFriends();
  }, [token]);

  // Загрузка входящих заявок
  useEffect(() => {
    const loadFriendRequests = async () => {
      if (!token) return;
      try {
        const requests = await fetchFriendRequests(token);
        setFriendRequests(requests);
      } catch (err: any) {
        console.error("Failed to load friend requests:", err);
      }
    };
    loadFriendRequests();
  }, [token]);

  // Обработчик добавления друга напрямую
  const handleAddFriend = async () => {
    if (!newFriend.trim() || !token) return;
    try {
      await addFriend(newFriend, token);
      setFriends((prev) => [...prev, newFriend]);
      setNewFriend("");
      setSuccess(`Friend "${newFriend}" added successfully!`);
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add friend");
    }
  };

  // Обработчик удаления друга
  const handleRemoveFriend = async (friendName: string) => {
    if (!token) return;
    try {
      await removeFriend(friendName, token);
      setFriends((prev) => prev.filter((friend) => friend !== friendName));
      setSuccess(`Friend "${friendName}" removed successfully!`);
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove friend");
    }
  };

  // Обработчик принятия заявки в друзья
  const handleAcceptFriendRequest = async (requestId: number) => {
    if (!token) return;
    try {
      await acceptFriendRequest(requestId, token);
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err: any) {
      console.error("Failed to accept friend request:", err);
    }
  };

  // Обработчик отклонения заявки в друзья
  const handleDeclineFriendRequest = async (requestId: number) => {
    if (!token) return;
    try {
      await declineFriendRequest(requestId, token);
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err: any) {
      console.error("Failed to decline friend request:", err);
    }
  };

  // Обработчик отправки заявки другу
  const handleSendFriendRequest = async () => {
    if (!requestUsername.trim() || !token) return;
    try {
      await requestFriend(requestUsername, token);
      setSuccess(`Friend request sent to ${requestUsername}`);
      setRequestUsername("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to send friend request");
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-4">Друзья</h1>

      {/* Поле поиска (заглушка) */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск друзей..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Окно добавления нового друга напрямую */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Добавить друга"
          value={newFriend}
          onChange={(e) => setNewFriend(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <Button variant="primary" onClick={handleAddFriend}>
          Добавить
        </Button>
      </div>

      {/* Окно для отправки заявки другу */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Отправить заявку другу"
          value={requestUsername}
          onChange={(e) => setRequestUsername(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <Button variant="primary" onClick={handleSendFriendRequest}>
          Отправить заявку
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}

      {/* Секция входящих заявок */}
      {friendRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Заявки в друзья</h2>
          <div className="grid gap-2">
            {friendRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm">
                <span>Заявка от: {req.fromUserID}</span>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAcceptFriendRequest(req.id)}>
                    Принять
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeclineFriendRequest(req.id)}>
                    Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Секция списка друзей */}
      <div className="grid gap-4">
        {friends.length === 0 ? (
          <p className="text-gray-500">Нет друзей. Добавьте новых друзей!</p>
        ) : (
          friends.map((friend) => (
            <div key={friend} className="flex justify-between items-center p-4 border rounded-lg shadow-sm bg-white">
              <span>{friend}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveFriend(friend)}>
                Удалить
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
