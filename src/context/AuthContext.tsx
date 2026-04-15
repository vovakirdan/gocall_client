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

// AuthProvider keeps authenticated user state in sync with token storage and the backend profile.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async (storedToken: string) => {
    try {
      const me = await getMe(storedToken);
      setUser(me);
    } catch (error) {
      console.error("Failed to hydrate current user:", error);
      await removeToken();
      setTokenState(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const loadTokenAndUser = async () => {
      const storedToken = await getToken();
      setTokenState(storedToken);

      if (storedToken) {
        await hydrateUser(storedToken);
      }

      setLoading(false);
    };

    loadTokenAndUser();
  }, []);

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      await saveToken(newToken);
      await hydrateUser(newToken);
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
