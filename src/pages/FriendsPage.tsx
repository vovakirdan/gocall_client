import React, { useState, useEffect } from "react";
import { fetchFriends, addFriend, removeFriend } from "../services/friends-api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

const FriendsPage: React.FC = () => {
  // Состояния для списка друзей, строки поиска, ввода нового друга, сообщений об ошибке/успехе
  const { token } = useAuth();
  const [friends, setFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // Заглушка поиска
  const [newFriend, setNewFriend] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Загрузка друзей с бекенда при монтировании компонента
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

  // Обработчик добавления друга
  const handleAddFriend = async () => {
    if (!newFriend.trim()) return;
    try {
      await addFriend(newFriend, token!);
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
    try {
      await removeFriend(friendName, token!);
      setFriends((prev) => prev.filter((friend) => friend !== friendName));
      setSuccess(`Friend "${friendName}" removed successfully!`);
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove friend");
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

      {/* Окно добавления нового друга */}
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

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}

      {/* Плашки друзей с возможностью удаления */}
      <div className="grid gap-4">
        {friends.length === 0 ? (
          <p className="text-gray-500">Нет друзей. Добавьте новых друзей!</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend}
              className="flex justify-between items-center p-4 border rounded-lg shadow-sm bg-white"
            >
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
