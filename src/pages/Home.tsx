import React, { useEffect, useState } from "react";
import { fetchRooms, createRoom, deleteRoom, Room } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { fetchFriends, addFriend, removeFriend } from "../services/friends-api";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const [friends, setFriends] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]); // Список комнат
  const [newRoomName, setNewRoomName] = useState(""); // Новая комната
  const [newFriend, setNewFriend] = useState(""); // Новый друг
  const [error, setError] = useState(""); // Ошибки
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  // Загрузка друзей и комнат
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!token) return;

        const loadedRooms = await fetchRooms(token);
        const loadedFriends = await fetchFriends(token);

        setRooms(loadedRooms);
        setFriends(loadedFriends);
      } catch (err) {
        setError("Failed to load data");
      }
    };

    loadData();
  }, [token]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const room = await createRoom(newRoomName, token!);
      setRooms((prev) => [...prev, room]);
      setNewRoomName("");
    } catch (err) {
      setError("Failed to create room");
    }
  };

  const handleJoinRoom = async (roomID: string, roomName: string) => {
    try {
      // Navigate to RoomPage, passing roomID as URL param
      // Optionally pass roomName as a query param if you want to use it there
      navigate(`/room/${roomID}?name=${encodeURIComponent(roomName)}`);
      // The actual connection logic (offer/answer exchange, media, etc.)
      // will be handled inside `RoomPage.tsx`.
    } catch (err) {
      console.error("Failed to join room:", err);
      setError("Failed to join room");
    }
  };  

  // Удаление комнаты
  const handleDeleteRoom = async (roomID: string) => {
    try {
      await deleteRoom(roomID, token!);
      setRooms((prev) => prev.filter((room) => room.RoomID !== roomID));
    } catch (err) {
      setError("Failed to delete room");
    }
  };  

  // Добавление друга
  const handleAddFriend = async () => {
    if (!newFriend.trim()) return;
    try {
      await addFriend(newFriend, token!);
      setFriends((prev) => [...prev, newFriend]);
      setNewFriend("");
    } catch (err) {
      setError("Failed to add friend");
    }
  };

  // Удаление друга
  const handleRemoveFriend = (friendName: string) => {
    setFriends((prev) => prev.filter((friend) => friend !== friendName));
  };

  // Логаут
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen">
      {/* Левая панель */}
      <div className="w-1/4 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Friends</h2>
          <ul className="mt-4 space-y-2">
            {(friends || []).map((friend) => (
              <li
                key={friend}
                className="flex justify-between items-center bg-gray-700 px-4 py-2 rounded-lg"
              >
                {friend}
                <button
                  onClick={() => handleRemoveFriend(friend)}
                  className="text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex">
            <input
              type="text"
              placeholder="Add friend"
              value={newFriend}
              onChange={(e) => setNewFriend(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-gray-600 text-white outline-none"
            />
            <button
              onClick={handleAddFriend}
              className="ml-2 px-4 py-1 bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
        <div className="p-4">
          <h2 className="text-lg font-bold">Rooms</h2>
          <ul className="mt-4 space-y-2">
            {rooms.map((room) => (
              <li
                key={room.RoomID}
                className="flex justify-between items-center bg-gray-700 px-4 py-2 rounded-lg"
              >
                <span>{room.Name}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleJoinRoom(room.RoomID, room.Name)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.RoomID)}
                    className="text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex">
            <input
              type="text"
              placeholder="Create room"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-gray-600 text-white outline-none"
            />
            <button
              onClick={handleCreateRoom}
              className="ml-2 px-4 py-1 bg-green-600 rounded-lg hover:bg-green-700"
            >
              Create
            </button>
          </div>
        </div>
      </div>
      {/* Основная панель */}
      <div className="flex-1 bg-gray-100">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Welcome to GoCall</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        <div className="p-4">
          <p>Select a room or create one to get started.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
