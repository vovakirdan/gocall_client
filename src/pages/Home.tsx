import React, { useEffect, useState } from "react";
import { fetchRooms, createRoom, Room } from "../services/api";

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      window.location.href = "/login"; // Если токена нет, возвращаем на логин
      return;
    }

    const loadRooms = async () => {
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

  return (
    <div className="home">
      <h1>Rooms</h1>
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
