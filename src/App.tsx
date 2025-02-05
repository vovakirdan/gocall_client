import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginSignupPage from "./pages/LoginSignupPage";
// Заменяем Home на новый Index:
import Index from "./pages/Index";
import RoomPage from "./pages/RoomPage";
import FriendsPage from "./pages/FriendsPage";
import RoomsPage from "./pages/RoomsPage";
import { checkAPIStatus } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
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
          <Route path="/login" element={<LoginSignupPage />} />
          {/* Защищённые маршруты внутри общего Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/home" element={<Index />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/room/:roomID" element={<RoomPage />} />
            <Route path="/" element={<Navigate to="/home" />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;