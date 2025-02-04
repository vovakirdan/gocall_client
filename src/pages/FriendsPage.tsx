import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import {
  fetchFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  requestFriend,
  fetchFriends,
  removeFriend,
  searchUsers,
} from "../services/friends-api";
import { FriendRequest, Friend, User } from "../types";

const FriendsPage: React.FC = () => {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Функция поиска
  const fetchSearchResults = useCallback(async () => {
    if (!token) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery, token);
      const filtered = results.filter(
        (user) => !friends.some((friend) => friend.friendID === user.userID)
      );
      setSearchResults(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, token, friends]);

  // Поиск при остановке ввода с задержкой 500 мс
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    const timeout = setTimeout(() => {
      fetchSearchResults();
    }, 500);
    setTypingTimeout(timeout);
  };

  // Поиск по кнопке
  const handleSearchClick = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    fetchSearchResults();
  };

  // Обработчик отправки заявки другу (из результатов поиска)
  const handleSendFriendRequest = async (username: string) => {
    if (!token) return;
    try {
      await requestFriend(username, token);
      setSuccess(`Friend request sent to ${username}`);
      setTimeout(() => setSuccess(""), 3000);
      // Удаляем отправленный элемент из результатов поиска
      setSearchResults((prev) => prev.filter((user) => user.username !== username));
    } catch (err: any) {
      setError(err.message || "Failed to send friend request");
    }
  };

  // Обработчик удаления друга
  const handleRemoveFriend = async (friendID: string) => {
    if (!token) return;
    try {
      await removeFriend(friendID, token);
      setFriends((prev) => prev.filter((friend) => friend.friendID !== friendID));
      setSuccess(`Friend "${friendID}" removed successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove friend");
    }
  };

  // Обработчик принятия заявки в друзья
  // После принятия заявки добавляем нового друга в список, используя req.fromUserID
  const handleAcceptFriendRequest = async (requestId: number, fromUserID: string) => {
    if (!token) return;
    try {
      await acceptFriendRequest(requestId, token);
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
      // Добавляем нового друга, если его ещё нет
      setFriends((prev) => {
        if (!prev.some((friend) => friend.friendID === fromUserID)) {
          return [
            ...prev,
            { id: requestId, userID: "", friendID: fromUserID, createdAt: new Date().toISOString() },
          ];
        }
        return prev;
      });
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

  return (
    <div className="min-h-screen flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-4">Друзья</h1>

      {/* Поле поиска + кнопка */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Поиск друзей..."
          value={searchQuery}
          onChange={handleInputChange}
          className="border p-2 rounded w-full"
        />
        <Button variant="primary" onClick={handleSearchClick}>
          Найти
        </Button>
      </div>

      {/* Секция результатов поиска */}
      {isSearching && <p className="text-gray-500">Идёт поиск...</p>}
      {searchResults.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Результаты поиска</h2>
          <div className="grid gap-2">
            {searchResults.map((user, index) => (
              <div
                key={user.userID || `user-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm"
              >
                <span>{user.username}</span>
                <Button variant="primary" size="sm" onClick={() => handleSendFriendRequest(user.username)}>
                  Отправить заявку
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Секция входящих заявок */}
      {friendRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Заявки в друзья</h2>
          <div className="grid gap-2">
            {friendRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm"
              >
                <span>Заявка от: {req.fromUserID}</span>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAcceptFriendRequest(req.id, req.fromUserID)}>
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
          <p className="text-gray-500">Нет друзей. Отправьте заявку, чтобы добавить друзей!</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend.id}
              className="flex justify-between items-center p-4 border rounded-lg shadow-sm bg-white"
            >
              <span>{friend.friendID}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveFriend(friend.friendID)}>
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
