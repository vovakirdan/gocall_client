/**
 * Call Context
 * Manages call state, signaling via WireChat WebSocket, and media via LiveKit
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import {
  WirechatClient,
  EventCallIncoming,
  EventCallRinging,
  EventCallAccepted,
  EventCallRejected,
  EventCallJoinInfo,
  EventCallParticipantJoined,
  EventCallParticipantLeft,
  EventCallEnded,
} from '../services/wirechat-ws';
import {
  LiveKitClient,
  ParticipantInfo,
  createLiveKitClient,
} from '../services/livekit';
import {
  createDirectCall,
  createRoomCall,
  joinCall as joinCallApi,
  endCall as endCallApi,
  CallResponse,
} from '../services/calls-api';
import { useAuth } from './AuthContext';

// === Types ===

export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';

export type CallType = 'direct' | 'room';

export interface CallParticipant {
  userId: number;
  username: string;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface CallState {
  status: CallStatus;
  callId: string | null;
  callType: CallType | null;
  remoteUser: { id: number; username: string } | null;
  roomId: number | null;
  roomName: string | null;
  participants: CallParticipant[];
  localMuted: boolean;
  localCameraOff: boolean;
  screenSharing: boolean;
  error: string | null;
  startTime: number | null;
}

// === Actions ===

type CallAction =
  | { type: 'INITIATE_CALL'; payload: { callType: CallType; targetId: number; roomName?: string } }
  | { type: 'INCOMING_CALL'; payload: EventCallIncoming }
  | { type: 'CALL_RINGING'; payload: EventCallRinging }
  | { type: 'CALL_ACCEPTED'; payload: EventCallAccepted }
  | { type: 'CALL_REJECTED'; payload: EventCallRejected }
  | { type: 'CALL_JOIN_INFO'; payload: EventCallJoinInfo }
  | { type: 'CALL_CONNECTED' }
  | { type: 'PARTICIPANT_JOINED'; payload: EventCallParticipantJoined }
  | { type: 'PARTICIPANT_LEFT'; payload: EventCallParticipantLeft }
  | { type: 'CALL_ENDED'; payload?: EventCallEnded }
  | { type: 'TOGGLE_MIC'; payload: boolean }
  | { type: 'TOGGLE_CAMERA'; payload: boolean }
  | { type: 'TOGGLE_SCREEN_SHARE'; payload: boolean }
  | { type: 'UPDATE_PARTICIPANTS'; payload: CallParticipant[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

// === Initial State ===

const initialState: CallState = {
  status: 'idle',
  callId: null,
  callType: null,
  remoteUser: null,
  roomId: null,
  roomName: null,
  participants: [],
  localMuted: true,
  localCameraOff: true,
  screenSharing: false,
  error: null,
  startTime: null,
};

const parseUserIDFromIdentity = (identity: string): number => {
  // LiveKit identity is generated as "user-<id>".
  const match = identity.match(/(\d+)$/);
  if (!match) return 0;
  return Number(match[1]) || 0;
};

// === Reducer ===

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'INITIATE_CALL':
      return {
        ...state,
        status: 'outgoing',
        callType: action.payload.callType,
        roomId: action.payload.callType === 'room' ? action.payload.targetId : null,
        remoteUser:
          action.payload.callType === 'direct'
            ? { id: action.payload.targetId, username: '' }
            : null,
        roomName: action.payload.roomName || null,
        error: null,
      };

    case 'INCOMING_CALL':
      return {
        ...state,
        status: 'incoming',
        callId: action.payload.call_id,
        callType: action.payload.call_type,
        remoteUser: {
          id: action.payload.from_user_id,
          username: action.payload.from_username,
        },
        roomId: action.payload.room_id || null,
        roomName: action.payload.room_name || null,
        error: null,
      };

    case 'CALL_RINGING':
      return {
        ...state,
        remoteUser: {
          id: action.payload.to_user_id,
          username: action.payload.to_username,
        },
      };

    case 'CALL_ACCEPTED':
      return {
        ...state,
        status: 'connecting',
        callId: action.payload.call_id,
      };

    case 'CALL_REJECTED':
      return {
        ...state,
        status: 'ended',
        error: action.payload.reason || 'Call rejected',
      };

    case 'CALL_JOIN_INFO':
      return {
        ...state,
        callId: action.payload.call_id,
      };

    case 'CALL_CONNECTED':
      return {
        ...state,
        status: 'active',
        startTime: Date.now(),
        localMuted: false,
        localCameraOff: false,
      };

    case 'PARTICIPANT_JOINED':
      if (
        state.participants.some((p) => p.userId === action.payload.user_id)
      ) {
        return state;
      }
      return {
        ...state,
        participants: [
          ...state.participants,
          {
            userId: action.payload.user_id,
            username: action.payload.username,
            isLocal: false,
            isMuted: false,
            isCameraOff: false,
          },
        ],
      };

    case 'PARTICIPANT_LEFT':
      return {
        ...state,
        participants: state.participants.filter(
          (p) => p.userId !== action.payload.user_id
        ),
      };

    case 'CALL_ENDED':
      return {
        ...state,
        status: 'ended',
        error: action.payload?.reason || null,
      };

    case 'TOGGLE_MIC':
      return { ...state, localMuted: action.payload };

    case 'TOGGLE_CAMERA':
      return { ...state, localCameraOff: action.payload };

    case 'TOGGLE_SCREEN_SHARE':
      return { ...state, screenSharing: action.payload };

    case 'UPDATE_PARTICIPANTS':
      return { ...state, participants: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// === Context ===

interface CallContextValue {
  state: CallState;
  initiateCall: (type: CallType, targetId: number, roomName?: string) => void;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  resetCall: () => void;
  livekitClient: LiveKitClient | null;
  getLocalVideoTrack: () => MediaStreamTrack | null;
  getRemoteParticipants: () => ParticipantInfo[];
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

// === Provider ===

interface CallProviderProps {
  children: React.ReactNode;
  wirechatClient: WirechatClient | null;
}

export const CallProvider: React.FC<CallProviderProps> = ({
  children,
  wirechatClient,
}) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const { token } = useAuth();
  const livekitClientRef = useRef<LiveKitClient | null>(null);
  const pendingJoinInfoRef = useRef<EventCallJoinInfo | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // Initialize LiveKit client
  useEffect(() => {
    if (!livekitClientRef.current) {
      livekitClientRef.current = createLiveKitClient();
    }

    return () => {
      livekitClientRef.current?.disconnect();
    };
  }, []);

  // Setup WireChat call event handlers
  useEffect(() => {
    if (!wirechatClient) return;

    wirechatClient.setHandlers({
      onCallIncoming: (data) => {
        dispatch({ type: 'INCOMING_CALL', payload: data });
      },
      onCallRinging: (data) => {
        dispatch({ type: 'CALL_RINGING', payload: data });
      },
      onCallAccepted: (data) => {
        dispatch({ type: 'CALL_ACCEPTED', payload: data });
      },
      onCallRejected: (data) => {
        dispatch({ type: 'CALL_REJECTED', payload: data });
      },
      onCallJoinInfo: (data) => {
        dispatch({ type: 'CALL_JOIN_INFO', payload: data });
        pendingJoinInfoRef.current = data;
        // Connect to LiveKit
        connectToLiveKit(data);
      },
      onCallParticipantJoined: (data) => {
        dispatch({ type: 'PARTICIPANT_JOINED', payload: data });
      },
      onCallParticipantLeft: (data) => {
        dispatch({ type: 'PARTICIPANT_LEFT', payload: data });
      },
      onCallEnded: (data) => {
        dispatch({ type: 'CALL_ENDED', payload: data });
        disconnectLiveKit();
      },
    });
  }, [wirechatClient]);

  // Connect to LiveKit room
  const connectToLiveKit = useCallback(async (joinInfo: EventCallJoinInfo) => {
    if (!livekitClientRef.current) return;

    try {
      livekitClientRef.current.setHandlers({
        onConnected: () => {
          dispatch({ type: 'CALL_CONNECTED' });
        },
        onDisconnected: () => {
          // LiveKit disconnected - call may have ended
        },
        onParticipantConnected: () => {
          dispatch({
            type: 'UPDATE_PARTICIPANTS',
            payload: livekitClientRef.current?.getAllParticipants().map(p => ({
              userId: parseUserIDFromIdentity(p.identity),
              username: p.name,
              isLocal: p.isLocal,
              isMuted: p.isMuted,
              isCameraOff: p.isCameraOff,
            })) || [],
          });
        },
        onParticipantDisconnected: () => {
          dispatch({
            type: 'UPDATE_PARTICIPANTS',
            payload: livekitClientRef.current?.getAllParticipants().map(p => ({
              userId: parseUserIDFromIdentity(p.identity),
              username: p.name,
              isLocal: p.isLocal,
              isMuted: p.isMuted,
              isCameraOff: p.isCameraOff,
            })) || [],
          });
        },
        onError: (error) => {
          dispatch({ type: 'SET_ERROR', payload: error.message });
        },
      });

      await livekitClientRef.current.connect({
        url: joinInfo.url,
        token: joinInfo.token,
        roomName: joinInfo.room_name,
      });

      // Try to enable media after connecting (may fail if permission denied)
      try {
        await livekitClientRef.current.enableMic();
      } catch (e) {
        console.warn('[CallContext] Could not enable mic:', e);
      }
      try {
        await livekitClientRef.current.enableCamera();
      } catch (e) {
        console.warn('[CallContext] Could not enable camera:', e);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to call';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Disconnect from LiveKit
  const disconnectLiveKit = useCallback(async () => {
    if (livekitClientRef.current) {
      await livekitClientRef.current.disconnect();
    }
  }, []);

  // === Actions ===

  const initiateCall = useCallback(
    async (type: CallType, targetId: number, roomName?: string) => {
      console.log('[CallContext] initiateCall:', { type, targetId, roomName, hasToken: !!token });

      if (!token) {
        console.error('[CallContext] No auth token!');
        dispatch({ type: 'SET_ERROR', payload: 'Not authenticated' });
        return;
      }

      dispatch({ type: 'INITIATE_CALL', payload: { callType: type, targetId, roomName } });

      try {
        let call: CallResponse;
        if (type === 'direct') {
          console.log('[CallContext] Creating direct call to user:', targetId);
          call = await createDirectCall(targetId, token);
        } else {
          console.log('[CallContext] Creating room call for room:', targetId);
          call = await createRoomCall(targetId, token);
        }

        console.log('[CallContext] Call created:', call);
        currentCallIdRef.current = call.id;

        // Now join the call to get LiveKit credentials
        console.log('[CallContext] Joining call:', call.id);
        const joinInfo = await joinCallApi(call.id, token);
        console.log('[CallContext] Got join info:', joinInfo);

        // Connect to LiveKit
        await connectToLiveKit({
          call_id: call.id,
          url: joinInfo.url,
          token: joinInfo.token,
          room_name: joinInfo.room_name,
          identity: joinInfo.identity,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create call';
        console.error('[CallContext] Call creation failed:', message);
        dispatch({ type: 'SET_ERROR', payload: message });
        dispatch({ type: 'RESET' });
      }
    },
    [token, connectToLiveKit]
  );

  const acceptCall = useCallback(async () => {
    if (!wirechatClient || !state.callId) {
      dispatch({ type: 'SET_ERROR', payload: 'Cannot accept call' });
      return;
    }

    wirechatClient.acceptCall(state.callId);
    // After accepting, server will send call.join-info which triggers LiveKit connection
  }, [wirechatClient, state.callId]);

  const rejectCall = useCallback(
    (reason?: string) => {
      if (!wirechatClient || !state.callId) return;

      wirechatClient.rejectCall(state.callId, reason);
      dispatch({ type: 'RESET' });
    },
    [wirechatClient, state.callId]
  );

  const endCall = useCallback(async () => {
    const callId = state.callId || currentCallIdRef.current;

    // Disconnect from LiveKit first
    await disconnectLiveKit();

    // End call via REST API if we have a call ID and token
    if (callId && token) {
      try {
        await endCallApi(callId, token);
        console.log('[CallContext] Call ended via API');
      } catch (err) {
        console.warn('[CallContext] Failed to end call via API:', err);
      }
    }

    currentCallIdRef.current = null;
    dispatch({ type: 'RESET' });
  }, [state.callId, token, disconnectLiveKit]);

  const toggleMic = useCallback(async () => {
    if (!livekitClientRef.current) return;

    try {
      const muted = await livekitClientRef.current.toggleMic();
      dispatch({ type: 'TOGGLE_MIC', payload: !muted });
    } catch (err) {
      console.error('Failed to toggle mic:', err);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (!livekitClientRef.current) return;

    try {
      const enabled = await livekitClientRef.current.toggleCamera();
      dispatch({ type: 'TOGGLE_CAMERA', payload: !enabled });
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!livekitClientRef.current) return;

    try {
      const enabled = await livekitClientRef.current.toggleScreenShare();
      dispatch({ type: 'TOGGLE_SCREEN_SHARE', payload: enabled });
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  }, []);

  const resetCall = useCallback(() => {
    disconnectLiveKit();
    dispatch({ type: 'RESET' });
  }, [disconnectLiveKit]);

  const getLocalVideoTrack = useCallback(() => {
    const track = livekitClientRef.current?.getLocalVideoTrack();
    return track?.mediaStreamTrack || null;
  }, []);

  const getRemoteParticipants = useCallback(() => {
    return livekitClientRef.current?.getAllParticipants().filter(p => !p.isLocal) || [];
  }, []);

  const value: CallContextValue = {
    state,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    resetCall,
    livekitClient: livekitClientRef.current,
    getLocalVideoTrack,
    getRemoteParticipants,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

// === Hook ===

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
