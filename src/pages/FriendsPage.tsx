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
  pinFriend,
  unpinFriend
} from "../services/friends-api";
import { FriendRequest, Friend, UserInfo } from "../types";
import { getUserInfo } from "../services/api";
import { useNavigate } from "react-router-dom";

const FriendsPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [friendRequestUsernames, setFriendRequestUsernames] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const [friendsData, requests] = await Promise.all([
          fetchFriends(token),
          fetchFriendRequests(token),
        ]);
        setFriends(friendsData);
        setFriendRequests(requests);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      }
    };

    loadData();
  }, [token]); // Загружаем список друзей и заявки 1 раз при изменении токена

  useEffect(() => {
    if (!token || friendRequests.length === 0) return;

    const loadUsernames = async () => {
      const usernames: { [key: number]: string } = {};
      for (const req of friendRequests) {
        try {
          const userInfo = await getUserInfo(token, req.from_user_id);
          usernames[req.id] = userInfo.username;
        } catch (err) {
          console.warn(`Failed to fetch user info for ${req.from_user_id}:`, err);
          usernames[req.id] = "Unknown User";
        }
      }
      setFriendRequestUsernames(usernames);
    };

    loadUsernames();
  }, [token, friendRequests]); // Загружаем юзернеймы после обновления friendRequests

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
        (user) => !friends.some((friend) => friend.username === user.username)
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
      setSearchResults((prev) => prev.filter((foundUser) => foundUser.username !== username && foundUser.id !== user?.id));
    } catch (err: any) {
      setError(err.message || "Failed to send friend request");
    }
  };

  // Обработчик удаления друга
  const handleRemoveFriend = async (friendID: string) => {
    if (!token) return;
    try {
      await removeFriend(friendID, token);
      setFriends((prev) => prev.filter((friend) => friend.user_id !== friendID));
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
        if (!prev.some((friend) => friend.user_id === fromUserID)) {
          return [
            ...prev,
            {
              id: requestId,
              user_id: fromUserID,
              username: prev.find((user) => user.user_id === fromUserID)?.username || "",
              is_online: false,
              is_pinned: false
            },
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

  // Обработчик закрепления друга
  const handlePin = async (friend: Friend) => {
    if (!token) return;
    try {
      await pinFriend(friend.id, token);
      setSuccess(`Friend "${friend.username}" pinned`);
      setTimeout(() => setSuccess(""), 3000);

      setFriends((prev) =>
        prev.map((f) =>
          f.id === friend.id ? { ...f, is_pinned: true } : f
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to pin friend");
    }
  };

  // Обработчик открепления друга
  const handleUnpin = async (friend: Friend) => {
    if (!token) return;
    try {
      await unpinFriend(friend.id, token);
      setSuccess(`Friend "${friend.username}" unpinned`);
      setTimeout(() => setSuccess(""), 3000);

      setFriends((prev) =>
        prev.map((f) =>
          f.id === friend.id ? { ...f, is_pinned: false } : f
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to unpin friend");
    }
  };

  // Обработчик перехода в чат
  const goToChat = (friend: Friend) => {
    navigate(`/chat/${friend.user_id}`);
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
                key={user.username || `user-${index}`}
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
                <span>
                  <strong className="text-blue-600">{friendRequestUsernames[req.id]}</strong> хочет добавить вас в друзья
                </span>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAcceptFriendRequest(req.id, req.from_user_id)}>
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
              <span>{friend.username}</span>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => goToChat(friend)}>
                  Чат
                </Button>
                {friend.is_pinned ? (
                  <Button variant="ghost" size="sm" onClick={() => handleUnpin(friend)}>
                    Unpin
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => handlePin(friend)}>
                    Pin
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleRemoveFriend(friend.user_id)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Display success/error messages */}
      {success && <div className="text-green-500 mt-4">{success}</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
};

export default FriendsPage;
