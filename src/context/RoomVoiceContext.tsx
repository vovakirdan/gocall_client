import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import {
  createLiveKitClient,
  LiveKitClient,
  ParticipantInfo,
} from "../services/livekit";
import { Track } from "livekit-client";
import {
  fetchRoomVoiceCredentials,
  joinRoomVoice,
  leaveRoomVoice,
  updateRoomVoiceMedia,
} from "../services/rooms-api";

// RoomVoiceStatus represents the lifecycle of the room-scoped voice session.
export type RoomVoiceStatus = "idle" | "connecting" | "active";

// RoomVoiceState stores the current room voice session, participants, and local media flags.
export interface RoomVoiceState {
  status: RoomVoiceStatus;
  roomId: string | null;
  roomName: string | null;
  participants: ParticipantInfo[];
  localMuted: boolean;
  localCameraOff: boolean;
  screenSharing: boolean;
  error: string | null;
  connectedAt: number | null;
}

const initialState: RoomVoiceState = {
  status: "idle",
  roomId: null,
  roomName: null,
  participants: [],
  localMuted: true,
  localCameraOff: true,
  screenSharing: false,
  error: null,
  connectedAt: null,
};

interface RoomVoiceContextValue {
  state: RoomVoiceState;
  joinRoomVoiceSession: (roomId: string, roomName?: string) => Promise<void>;
  leaveRoomVoiceSession: (roomIdOverride?: string) => Promise<void>;
  toggleRoomVoiceMic: () => Promise<void>;
  toggleRoomVoiceCamera: () => Promise<void>;
  toggleRoomVoiceScreenShare: () => Promise<void>;
  clearRoomVoiceError: () => void;
  getLocalVideoTrack: () => Track | null;
  getLocalScreenShareTrack: () => Track | null;
  getParticipants: () => ParticipantInfo[];
  livekitClient: LiveKitClient | null;
}

const RoomVoiceContext = createContext<RoomVoiceContextValue | undefined>(undefined);

// RoomVoiceProvider manages the persistent room-scoped voice session and LiveKit client.
export const RoomVoiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, logout } = useAuth();
  const clientRef = useRef<LiveKitClient | null>(null);
  const transitionInProgressRef = useRef(false);
  const [state, setState] = useState<RoomVoiceState>(initialState);

  const isSessionError = useCallback((message: string) => {
    return message.startsWith("Session expired:") || message === "Not authenticated";
  }, []);

  const syncParticipants = useCallback(() => {
    const participants = clientRef.current?.getAllParticipants() ?? [];
    setState((current) => ({ ...current, participants }));
  }, []);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = createLiveKitClient();
    }

    return () => {
      void clientRef.current?.disconnect();
      clientRef.current?.clearHandlers();
    };
  }, []);

  const resetState = useCallback((error: string | null = null) => {
    setState({
      ...initialState,
      error,
    });
  }, []);

  const handleSessionFailure = useCallback(
    async (message: string) => {
      try {
        await clientRef.current?.disconnect();
      } catch {
        // Best-effort disconnect for stale sessions.
      }
      resetState(message);
      logout();
    },
    [logout, resetState]
  );

  const leaveRoomVoiceSession = useCallback(async (roomIdOverride?: string) => {
    const roomId = roomIdOverride ?? state.roomId;
    const client = clientRef.current;

    try {
      await client?.disconnect();
    } catch (error) {
      console.warn("[RoomVoiceContext] Failed to disconnect LiveKit room voice:", error);
    }

    let leaveError: string | null = null;
    if (roomId && token) {
      try {
        await leaveRoomVoice(roomId, token);
      } catch (error) {
        leaveError =
          error instanceof Error ? error.message : "Failed to leave room voice";
      }
    }

    if (leaveError && isSessionError(leaveError)) {
      await handleSessionFailure(leaveError);
      return;
    }

    resetState(leaveError);
  }, [handleSessionFailure, isSessionError, resetState, state.roomId, token]);

  const joinRoomVoiceSession = useCallback(
    async (roomId: string, roomName?: string) => {
      if (transitionInProgressRef.current) {
        return;
      }

      if (!token) {
        resetState("Not authenticated");
        return;
      }

      if (state.roomId === roomId && state.status === "active") {
        return;
      }

      if (!clientRef.current) {
        clientRef.current = createLiveKitClient();
      }

      transitionInProgressRef.current = true;

      try {
        if (state.roomId && state.roomId !== roomId) {
          await leaveRoomVoiceSession();
        }

        setState((current) => ({
          ...current,
          status: "connecting",
          roomId,
          roomName: roomName ?? current.roomName,
          error: null,
        }));

        await joinRoomVoice(roomId, token);
        const credentials = await fetchRoomVoiceCredentials(roomId, token);

        clientRef.current.setHandlers({
          onConnected: () => {
            syncParticipants();
            setState((current) => ({
              ...current,
              status: "active",
              roomId,
              roomName: roomName ?? current.roomName ?? credentials.room_name,
              localMuted: !clientRef.current?.isMicEnabled(),
              localCameraOff: !clientRef.current?.isCameraEnabled(),
              screenSharing: clientRef.current?.isScreenShareEnabled() ?? false,
              connectedAt: Date.now(),
              error: null,
            }));
          },
          onDisconnected: () => {
            resetState(null);
          },
          onParticipantConnected: syncParticipants,
          onParticipantDisconnected: syncParticipants,
          onLocalTrackPublished: syncParticipants,
          onLocalTrackUnpublished: syncParticipants,
          onTrackSubscribed: syncParticipants,
          onTrackUnsubscribed: syncParticipants,
          onTrackMuted: syncParticipants,
          onTrackUnmuted: syncParticipants,
          onMicMuted: (muted) => {
            setState((current) => ({ ...current, localMuted: muted }));
            syncParticipants();
          },
          onCameraMuted: (muted) => {
            setState((current) => ({ ...current, localCameraOff: muted }));
            syncParticipants();
          },
          onScreenShareStarted: () => {
            setState((current) => ({ ...current, screenSharing: true }));
            syncParticipants();
          },
          onScreenShareStopped: () => {
            setState((current) => ({ ...current, screenSharing: false }));
            syncParticipants();
          },
          onError: (error) => {
            setState((current) => ({ ...current, error: error.message }));
          },
        });

        await clientRef.current.connect({
          url: credentials.url,
          token: credentials.token,
          roomName: credentials.room_name,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to join room voice";
        try {
          await leaveRoomVoice(roomId, token);
        } catch {
          // Best-effort cleanup for partially created room voice presence.
        }

        if (isSessionError(message)) {
          await handleSessionFailure(message);
          return;
        }
        resetState(message);
      } finally {
        transitionInProgressRef.current = false;
      }
    },
    [handleSessionFailure, isSessionError, leaveRoomVoiceSession, resetState, state.roomId, syncParticipants, token]
  );

  const syncMediaState = useCallback(
    async (patch: {
      is_mic_enabled?: boolean;
      is_camera_enabled?: boolean;
      is_screen_sharing?: boolean;
    }) => {
      if (!token || !state.roomId) {
        return;
      }

      await updateRoomVoiceMedia(state.roomId, patch, token);
    },
    [state.roomId, token]
  );

  const toggleRoomVoiceMic = useCallback(async () => {
    if (!clientRef.current || state.status !== "active") {
      return;
    }

    try {
      const enabled = await clientRef.current.toggleMic();
      setState((current) => ({ ...current, localMuted: !enabled, error: null }));
      await syncMediaState({ is_mic_enabled: enabled });
      syncParticipants();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle microphone";
      if (isSessionError(message)) {
        await handleSessionFailure(message);
        return;
      }
      setState((current) => ({ ...current, error: message }));
    }
  }, [handleSessionFailure, isSessionError, state.status, syncMediaState, syncParticipants]);

  const toggleRoomVoiceCamera = useCallback(async () => {
    if (!clientRef.current || state.status !== "active") {
      return;
    }

    try {
      const enabled = await clientRef.current.toggleCamera();
      setState((current) => ({ ...current, localCameraOff: !enabled, error: null }));
      await syncMediaState({ is_camera_enabled: enabled });
      syncParticipants();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle camera";
      if (isSessionError(message)) {
        await handleSessionFailure(message);
        return;
      }
      setState((current) => ({ ...current, error: message }));
    }
  }, [handleSessionFailure, isSessionError, state.status, syncMediaState, syncParticipants]);

  const toggleRoomVoiceScreenShare = useCallback(async () => {
    if (!clientRef.current || state.status !== "active") {
      return;
    }

    try {
      const enabled = await clientRef.current.toggleScreenShare();
      setState((current) => ({ ...current, screenSharing: enabled, error: null }));
      await syncMediaState({ is_screen_sharing: enabled });
      syncParticipants();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle screen share";
      if (isSessionError(message)) {
        await handleSessionFailure(message);
        return;
      }
      setState((current) => ({ ...current, error: message }));
    }
  }, [handleSessionFailure, isSessionError, state.status, syncMediaState, syncParticipants]);

  const clearRoomVoiceError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  const getLocalVideoTrack = useCallback(() => {
    return clientRef.current?.getLocalVideoTrack() ?? null;
  }, []);

  const getLocalScreenShareTrack = useCallback(() => {
    return clientRef.current?.getScreenShareTrack() ?? null;
  }, []);

  const getParticipants = useCallback(() => {
    return clientRef.current?.getAllParticipants() ?? [];
  }, []);

  const value = useMemo<RoomVoiceContextValue>(
    () => ({
      state,
      joinRoomVoiceSession,
      leaveRoomVoiceSession,
      toggleRoomVoiceMic,
      toggleRoomVoiceCamera,
      toggleRoomVoiceScreenShare,
      clearRoomVoiceError,
      getLocalVideoTrack,
      getLocalScreenShareTrack,
      getParticipants,
      livekitClient: clientRef.current,
    }),
    [
      clearRoomVoiceError,
      getLocalVideoTrack,
      getLocalScreenShareTrack,
      getParticipants,
      joinRoomVoiceSession,
      leaveRoomVoiceSession,
      state,
      toggleRoomVoiceCamera,
      toggleRoomVoiceMic,
      toggleRoomVoiceScreenShare,
    ]
  );

  return (
    <RoomVoiceContext.Provider value={value}>{children}</RoomVoiceContext.Provider>
  );
};

export const useRoomVoice = () => {
  const context = useContext(RoomVoiceContext);
  if (!context) {
    throw new Error("useRoomVoice must be used within a RoomVoiceProvider");
  }
  return context;
};
