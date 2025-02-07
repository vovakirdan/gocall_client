import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
  } from "react";
  import { useAuth } from "./AuthContext";
  
  /**
   * An example shape for chat messages across the app
   */
  interface ChatMessage {
    from: string;
    to: string;
    message: string;
  }
  
  /**
   * The shape of the data we provide from this context
   * - messages: an array of all messages for the entire session
   * - sendMessage: function to send a new chat message
   */
  interface WebSocketContextValue {
    messages: ChatMessage[];
    sendMessage: (to: string, message: string) => void;
  }
  
  /**
   * Create the actual context with default undefined
   */
  const WebSocketContext = createContext<WebSocketContextValue | undefined>(
    undefined
  );
  
  /**
   * Provider component that opens a single WebSocket connection
   * and shares messages + sendMessage function via context.
   */
  export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    const { token, user } = useAuth(); // from your existing AuthContext
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
  
    // Open the WebSocket once (if token exists).
    useEffect(() => {
      if (!token || !user) return;
      const wsUrl = "ws://localhost:8080/api/chat/ws?token=" + token;
      socketRef.current = new WebSocket(wsUrl);
  
      // On receiving a message from server, store it
      socketRef.current.onmessage = (event: MessageEvent) => {
        try {
          const data: ChatMessage = JSON.parse(event.data);
          // Add to list of all messages
          setMessages((prev) => [...prev, data]);
        } catch (error) {
          console.error("WebSocket parse error:", error);
        }
      };
  
      socketRef.current.onopen = () => {
        console.log("WebSocket connected.");
      };
  
      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
  
      // Cleanup on unmount or if token changes
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    }, [token, user]);
  
    /**
     * Send a message to the server via the single WebSocket
     * @param to string - friendUserId
     * @param message string
     */
    const sendMessage = (to: string, message: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not open. Cannot send message.");
        return;
      }
      if (!user) return;
  
      const payload: ChatMessage = {
        from: user.user_id,
        to,
        message,
      };
  
      socketRef.current.send(JSON.stringify(payload));
      setMessages((prev) => [...prev, payload]); // optimistic update
    };
  
    const contextValue: WebSocketContextValue = {
      messages,
      sendMessage,
    };
  
    return (
      <WebSocketContext.Provider value={contextValue}>
        {children}
      </WebSocketContext.Provider>
    );
  };
  
  /**
   * Hook to use the WebSocketContext in any component
   */
  export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
      throw new Error("useWebSocketContext must be used within a WebSocketProvider");
    }
    return context;
  };
  