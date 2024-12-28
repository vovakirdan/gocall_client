import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginSignupPage from "./pages/LoginSignupPage";
import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";
import { checkAPIStatus } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { isDesktop } from "./utils/platform";

function App() {
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    console.log(isDesktop() ? "I am desktop" : "I am browser");
    console.log("Checking API availability...");
    const checkAPI = async () => {
      const isAvailable = await checkAPIStatus();
      setApiAvailable(isAvailable);
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
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/login" element={<LoginSignupPage />} />
          <Route path="/room/:roomID" element={<RoomPage />} />
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
    </AuthProvider>
  );
}

export default App;
