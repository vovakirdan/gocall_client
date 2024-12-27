import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, saveToken, removeToken } from "../adapters/token-adapter";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await getToken();
      setTokenState(storedToken);
      setLoading(false); // Токен загружен, прекращаем загрузку
    };

    loadToken();
  }, []);

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      await saveToken(newToken);
    } else {
      await removeToken();
    }
  };

  const logout = () => {
    setToken(null);
  };

  if (loading) {
    // Показываем "загрузку", пока токен загружается
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
