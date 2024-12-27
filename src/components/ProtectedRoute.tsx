import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../adapters/token-adapter";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      setIsAuthenticated(!!token);
    };

    checkAuth();
  }, []);

  // while checking show "loading" // todo make it beautiful!
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  // If no token go login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // show children else
  return children;
};

export default ProtectedRoute;
