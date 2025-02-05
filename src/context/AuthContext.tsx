import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, saveToken, removeToken } from "../adapters/token-adapter";
import { getMe } from "../services/api";
import { User } from "../types";

interface AuthContextType {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokenAndUser = async () => {
      const storedToken = await getToken();
      setTokenState(storedToken);

      if (storedToken) {
        try {
          const userInfo = await getMe(storedToken);
          setUser(userInfo);
        } catch (error) {
          console.error("Failed to fetch user info:", error);
          removeToken();
          setTokenState(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    loadTokenAndUser();
  }, []);

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      await saveToken(newToken);
      try {
        const userInfo = await getMe(newToken);
        setUser(userInfo);
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        removeToken();
        setTokenState(null);
        setUser(null);
      }
    } else {
      await removeToken();
      setUser(null);
    }
  };

  const logout = () => {
    setToken(null);
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, setToken, logout }}>
      {!loading ? children : <div>Loading...</div>}
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
