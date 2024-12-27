import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { login, register } from "../services/api";

const LoginSignupPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true); // true для логина, false для регистрации
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { setToken } = useAuth();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async () => {
    try {
        setError("");
        setSuccessMessage("");
        if (isLogin) {
            const token = await login(username, password);
            await setToken(token);
            window.location.href = "/home";
        } else {
            await register(username, password);
            setSuccessMessage("Registration successful! You can now log in.");
            toggleMode();
        }
    } catch (err: any) {
      setError(err.message || "Operation failed");
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Левая часть формы */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : "signup"}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={formVariants}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">
                {isLogin ? "Welcome back" : "Create an account"}
              </h1>
              <div className="space-y-4">
                {/* Поле для ввода username */}
                <InputField
                  icon={User}
                  placeholder="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {/* Поле для ввода password */}
                <InputField
                  icon={Lock}
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 mt-4">{error}</p>}
              {/* Кнопка отправки */}
              <div className="mt-8">
                <button
                  onClick={handleSubmit}
                  className={`text-white px-6 py-3 rounded-lg w-full flex items-center justify-center ${
                    isLogin ? "bg-blue-600" : "bg-green-600"
                  }`}
                >
                  {isLogin ? "Sign In" : "Sign Up"}{" "}
                  <ArrowRight className="ml-2" size={20} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* Правая панель для переключения режимов */}
      <div
        className={`w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 ${
          isLogin ? "bg-blue-600" : "bg-green-600"
        }`}
      >
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            {isLogin ? "New here?" : "Already have an account?"}
          </h2>
          <p className="text-gray-200 mb-8">
            {isLogin
              ? "Sign up to create a new account and explore features!"
              : "Sign in to access your account and continue."}
          </p>
          <button
            className="bg-white px-6 py-3 rounded-lg"
            style={{ color: isLogin ? "#2563EB" : "#059669" }}
            onClick={toggleMode}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({
    icon: Icon,
    placeholder,
    type,
    value,
    onChange,
  }: {
    icon: React.ElementType;
    placeholder: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div className="flex items-center bg-gray-100 p-3 rounded-lg">
      <Icon className="text-gray-500 mr-3" size={20} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="bg-transparent outline-none flex-1 text-gray-800"
      />
    </div>
  );  

export default LoginSignupPage;
