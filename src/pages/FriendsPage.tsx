import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Video } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import Button from "../components/Button";
import {
  fetchFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  requestFriend,
  fetchFriends,
  searchUsers,
} from "../services/friends-api";
import { FriendRequest, Friend, UserInfo } from "../types";

const FriendsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { initiateCall, state: callState } = useCall();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = searchQuery.trim();
  const showMinQueryHint = trimmedQuery.length > 0 && trimmedQuery.length < 3;

  const loadData = useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, []);

  const performSearch = useCallback(
    async (rawQuery: string) => {
      const q = rawQuery.trim();

      // Clear stale error as the user types / retries.
      setError("");

      if (q.length === 0) {
        abortRef.current?.abort();
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      if (q.length < 3) {
        abortRef.current?.abort();
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      if (!token) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      try {
        const results = await searchUsers(q, token, controller.signal);
        const filtered = results.filter(
          (user) => !friends.some((friend) => friend.username === user.username)
        );
        setSearchResults(filtered);
        setError("");
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        setSearchResults([]);
        setError(err.message || "Failed to search users");
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [token, friends]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError("");

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    const q = value.trim();
    if (q.length < 3) {
      abortRef.current?.abort();
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      void performSearch(value);
    }, 500);
  };

  const handleSearchClick = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    void performSearch(searchQuery);
  };

  const handleSendFriendRequest = async (targetUser: { id: number; username: string }) => {
    if (!token) return;
    try {
      await requestFriend(targetUser.id, token);
      setSuccess(`Friend request sent to ${targetUser.username}`);
      setTimeout(() => setSuccess(""), 3000);
      setSearchResults((prev) => prev.filter((foundUser) => foundUser.id !== targetUser.id));
    } catch (err: any) {
      setError(err.message || "Failed to send friend request");
    }
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    if (!token) return;
    try {
      await acceptFriendRequest(Number(request.from_user_id), token);
      await loadData();
      setSuccess("Friend request accepted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to accept friend request");
    }
  };

  const handleDeclineFriendRequest = async (request: FriendRequest) => {
    if (!token) return;
    try {
      await declineFriendRequest(Number(request.from_user_id), token);
      await loadData();
      setSuccess("Friend request declined");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to decline friend request");
    }
  };

  const goToChat = (friend: Friend) => {
    navigate(`/chat/${friend.friend_user_id}`, {
      state: { friendUsername: friend.username },
    });
  };

  const handleVideoCall = (friend: Friend) => {
    initiateCall("direct", friend.friend_user_id, friend.username);
  };

  const canMakeCall = callState.status === "idle" || callState.status === "ended";

  return (
    <div className="min-h-screen flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-4">Друзья</h1>

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

      {showMinQueryHint && (
        <p className="text-gray-500 mb-4">Введите минимум 3 символа для поиска</p>
      )}
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
                <Button variant="primary" size="sm" onClick={() => handleSendFriendRequest(user)}>
                  Отправить заявку
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

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
                  <strong className="text-blue-600">{req.from_username}</strong> хочет добавить вас
                  в друзья
                </span>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAcceptFriendRequest(req)}>
                    Принять
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeclineFriendRequest(req)}>
                    Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4">
        {friends.length === 0 ? (
          <p className="text-gray-500">Нет друзей. Отправьте заявку, чтобы добавить друзей.</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend.id}
              className="flex justify-between items-center p-4 border rounded-lg shadow-sm bg-white"
            >
              <span>{friend.username}</span>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => goToChat(friend)}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleVideoCall(friend)}
                  disabled={!canMakeCall}
                  title={canMakeCall ? "Video call" : "Already in a call"}
                >
                  <Video className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {success && <div className="text-green-500 mt-4">{success}</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
};

export default FriendsPage;
