import React from "react";
import { useAuth } from "../context/AuthContext";

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Настройки</h1>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Информация о пользователе</h2>
        <p><strong>Имя пользователя:</strong> {user ? user.username : "Гость"}</p>
        <p><strong>Email:</strong> {user ? user.email : "Не доступно"}</p>
      </div>
      <button
        onClick={logout}
        className="bg-red-500 text-white py-2 px-4 rounded"
      >
        Выйти
      </button>
    </div>
  );
};

export default SettingsPage;
