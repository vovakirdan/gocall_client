import React, { useEffect, useState } from "react";
import { fetchRooms, createRoom, Room } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState("");
  const { token, logout } = useAuth();

  useEffect(() => {
    const loadRooms = async () => {
      if (!token) {
        return; // Если токена нет, ничего не делаем
      }

      try {
        const roomsData = await fetchRooms(token);
        setRooms(roomsData); // Типизация защищает от ошибок
      } catch (err) {
        setError("Failed to fetch rooms");
      }
    };

    loadRooms();
  }, [token]);

  const handleCreateRoom = async () => {
    try {
      const room = await createRoom(newRoom, token!);
      setRooms((prev) => [...prev, room.room]);
      setNewRoom("");
    } catch (err) {
      setError("Failed to create room");
    }
  };

  const handleLogout = () => {
    logout(); // Удаляем токен и перенаправляем на /login
    window.location.href = "/login"; // На случай, если роутер не успеет среагировать
  };

  return (
    <div className="home">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Rooms</h1>
        <button onClick={handleLogout} style={{ background: "red", color: "white", padding: "5px 10px", border: "none", cursor: "pointer" }}>
          Logout
        </button>
      </header>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <input
          type="text"
          placeholder="New Room Name"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
        />
        <button onClick={handleCreateRoom}>Create Room</button>
      </div>
      <ul>
        {rooms.map((room) => (
          <li key={room.ID}>{room.Name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
