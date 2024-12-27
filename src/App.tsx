import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { checkAPIStatus } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import { getToken } from "./adapters/token-adapter";
import { isDesktop } from "./utils/platform";

function App() {
  const [apiAvailable, setApiAvailable] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkAPI = async () => {
      console.log(isDesktop() ? "I am desktop" : "I am browser")
      console.log("Checking API availability...");
      const isAvailable = await checkAPIStatus();
      console.log("API available:", isAvailable);
      setApiAvailable(isAvailable);

      console.log("Fetching token...");
      const storedToken = await getToken();
      console.log("Token fetched:", storedToken);
      setToken(storedToken);
    };

    checkAPI();
  }, []);

  if (!apiAvailable) {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h1>Server is unavailable</h1>
        <p>Please make sure the API is running and try again.</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* default to login */}
        <Route path="/" element={<Navigate to={token ? "/home" : "/login" } />} />
        {/* login */}
        <Route path="/login" element={<Login />} />
        {/* protected route */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
