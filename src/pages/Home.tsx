import React, { useEffect, useState } from "react";
import { fetchRooms, createRoom, deleteRoom, Room, fetchInvitedRooms, inviteFriendToRoom } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { fetchFriends, addFriend, removeFriend } from "../services/friends-api";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const [friends, setFriends] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invitedRooms, setInvitedRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState(""); // Новая комната
  const [newFriend, setNewFriend] = useState(""); // Новый друг
  const [error, setError] = useState(""); // Ошибки
  const { token, logout } = useAuth();
  const [popupError, setPopupError] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const navigate = useNavigate();

  // Загрузка друзей и комнат
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!token) return;

        const loadedRooms = await fetchRooms(token);
        const loadedFriends = await fetchFriends(token);
        const invitedRooms = await fetchInvitedRooms(token);

        setRooms(loadedRooms);
        setFriends(loadedFriends);
        setInvitedRooms(invitedRooms);
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
      setError("");
    } catch (err: any) {
      setError(err.message || "An error occurred while creating a room");
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
      showSuccessPopup(`Friend "${newFriend}" added successfully!`);
    } catch (err: any) {
      showErrorPopup(err.message || "An error occurred while adding a friend");
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

  const PopupMessage: React.FC<{ message: string; type: "success" | "error" }> = ({ message, type }) => (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg ${
        type === "success" ? "bg-green-500" : "bg-red-500"
      } text-white`}
    >
      {message}
      <button
        onClick={() => setPopupError(null)}
        className="ml-4 text-white underline hover:no-underline"
      >
        Close
      </button>
    </div>
  );  

  const showSuccessPopup = (message: string) => {
    setPopupError({ message, type: "success" });
    setTimeout(() => setPopupError(null), 5000);
  };
  
  const showErrorPopup = (message: string) => {
    setPopupError({ message, type: "error" });
    setTimeout(() => setPopupError(null), 5000);
  };   

  const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({
    isOpen,
    onClose,
    children,
  }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-4 rounded-lg shadow-lg w-96">
          <div>{children}</div>
          <button
            onClick={onClose}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  };  

  const handleOpenModal = (roomID: string) => {
    setSelectedRoom(roomID);
    setModalOpen(true);
  };
  
  const handleInviteFromModal = async (friendUsername: string) => {
    if (!selectedRoom) return;
  
    try {
      await inviteFriendToRoom(selectedRoom, friendUsername, token!);
      showSuccessPopup(`Friend "${friendUsername}" invited successfully!`);
      setModalOpen(false);
    } catch (err: any) {
      showErrorPopup(err.message || "Failed to invite friend");
    }
  };  

  const handleInviteFriend = async (roomID: string) => {
    const friendToInvite = window.prompt(
      "Select a friend to invite:",
      friends.join(", ")
    );
  
    if (friendToInvite && friends.includes(friendToInvite)) {
      try {
        await inviteFriendToRoom(roomID, friendToInvite, token!);
        showSuccessPopup(`Friend "${friendToInvite}" invited successfully!`);
      } catch (err: any) {
        showErrorPopup(err.message || "Failed to invite friend");
      }
    } else {
      showErrorPopup("Invalid friend selected.");
    }
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
                <span className="truncate flex-1">{friend}</span>
                <button
                  onClick={() => handleRemoveFriend(friend)}
                  className="ml-4 text-red-400 hover:text-red-600 whitespace-nowrap"
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
                  <button
                    onClick={() => handleOpenModal(room.RoomID)}
                    className="text-green-400 hover:text-green-600"
                  >
                    Invite
                  </button>
                </div>
              </li>
            ))}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
              <h2 className="text-lg font-bold">Invite a Friend</h2>
              <ul className="mt-4 space-y-2">
                {friends.map((friend) => (
                  <li
                    key={friend}
                    className="flex justify-between items-center bg-gray-200 px-4 py-2 rounded-lg"
                  >
                    <span>{friend}</span>
                    <button
                      onClick={() => handleInviteFromModal(friend)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Invite
                    </button>
                  </li>
                ))}
              </ul>
            </Modal>
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
        <div className="p-4">
          <h2 className="text-lg font-bold">Invited Rooms</h2>
          <ul className="mt-4 space-y-2">
            {(invitedRooms || []).map((room) => (
              <li
                key={room.RoomID}
                className="flex justify-between items-center bg-gray-700 px-4 py-2 rounded-lg"
              >
                <span>{room.Name}</span>
                <button
                  onClick={() => handleJoinRoom(room.RoomID, room.Name)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
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
      {popupError && (
        <PopupMessage message={popupError.message} type={popupError.type} />
      )}

    </div>
  );
};

export default Home;
