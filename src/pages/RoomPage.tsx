/**
 * Room Page
 * Video room using LiveKit for group calls
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCall } from '../context/CallContext';
import { useWebSocketContext } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { joinRoomAsMember } from '../services/rooms-api';
import { VideoTrack } from 'livekit-client';
import { ParticipantInfo } from '../services/livekit';

// Video tile for a participant
interface VideoTileProps {
  participant: ParticipantInfo;
}

const VideoTile: React.FC<VideoTileProps> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.videoTrack) {
      const videoTrack = participant.videoTrack as VideoTrack;
      videoTrack.attach(videoRef.current);

      return () => {
        if (videoRef.current) {
          videoTrack.detach(videoRef.current);
        }
      };
    }
  }, [participant.videoTrack]);

  const hasVideo = participant.videoTrack && !participant.isCameraOff;

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video shadow-lg">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Name and status badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/50 rounded-lg px-2 py-1">
        <span className="text-white text-sm font-medium">
          {participant.isLocal ? 'You' : participant.name}
        </span>
        {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
      </div>

      {/* Local indicator */}
      {participant.isLocal && (
        <div className="absolute top-2 right-2 bg-primary rounded px-2 py-0.5">
          <span className="text-xs font-medium text-white">You</span>
        </div>
      )}
    </div>
  );
};

// Control button component
interface ControlButtonProps {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  isActive?: boolean;
  isDanger?: boolean;
  onClick: () => void;
  label: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  activeIcon,
  isActive = false,
  isDanger = false,
  onClick,
  label,
}) => {
  const baseClasses = 'w-12 h-12 rounded-full flex items-center justify-center transition-all';
  const colorClasses = isDanger
    ? 'bg-red-500 hover:bg-red-600'
    : isActive
    ? 'bg-gray-600 hover:bg-gray-500'
    : 'bg-gray-700 hover:bg-gray-600';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${colorClasses}`}
      title={label}
    >
      {isActive && activeIcon ? activeIcon : icon}
    </button>
  );
};

export default function RoomPage(): JSX.Element {
  const { roomID } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state: callState,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    initiateCall,
    livekitClient,
  } = useCall();
  const { joinRoom, leaveRoom, isConnected } = useWebSocketContext();
  const { token } = useAuth();

  // Decode the room name from URL (it's the room name, not ID)
  const roomName = roomID ? decodeURIComponent(roomID) : '';
  // Get numeric room ID from navigation state (for calls)
  const numericRoomId = (location.state as { roomId?: number })?.roomId;

  // Join as member via REST API (required for calls) and WebSocket (for chat)
  useEffect(() => {
    if (!roomName || !isConnected) return;

    // Join WebSocket room for chat
    joinRoom(roomName);

    // Also join as member via REST API (required for calls)
    if (numericRoomId && token) {
      joinRoomAsMember(String(numericRoomId), token).catch((err) => {
        console.warn('Failed to join room as member:', err.message);
      });
    }

    return () => {
      if (roomName) {
        leaveRoom(roomName);
      }
    };
  }, [roomName, numericRoomId, token, isConnected, joinRoom, leaveRoom]);

  const handleStartCall = () => {
    if (numericRoomId && roomName) {
      initiateCall('room', numericRoomId, roomName);
    }
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleExit = () => {
    if (callState.status === 'active') {
      endCall();
    }
    navigate('/home');
  };

  // Get participants for display
  const participants = livekitClient?.getAllParticipants() || [];
  const isInCall = callState.status === 'active' || callState.status === 'connecting';

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Room: {roomName}</h1>
        </div>

        <div className="flex items-center gap-4">
          {isInCall && (
            <div className="flex items-center gap-2 text-white/80">
              <Users className="w-4 h-4" />
              <span className="text-sm">{participants.length}</span>
            </div>
          )}
          {!isInCall && numericRoomId && (
            <button
              onClick={handleStartCall}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
            >
              <Video className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Start Call</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isInCall ? (
          // Active call view
          <div className="h-full flex flex-col">
            {/* Video grid */}
            <div className="flex-1 p-4 overflow-auto">
              {callState.status === 'connecting' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Connecting...</p>
                  </div>
                </div>
              ) : (
                <div className={`grid ${getGridClass()} gap-4 h-full`}>
                  {participants.map((p) => (
                    <VideoTile key={p.sid} participant={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Call controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-4 p-4 bg-gray-800 border-t border-gray-700"
            >
              <ControlButton
                icon={<Mic className="w-5 h-5 text-white" />}
                activeIcon={<MicOff className="w-5 h-5 text-red-400" />}
                isActive={callState.localMuted}
                onClick={toggleMic}
                label={callState.localMuted ? 'Unmute' : 'Mute'}
              />

              <ControlButton
                icon={<Video className="w-5 h-5 text-white" />}
                activeIcon={<VideoOff className="w-5 h-5 text-red-400" />}
                isActive={callState.localCameraOff}
                onClick={toggleCamera}
                label={callState.localCameraOff ? 'Turn on camera' : 'Turn off camera'}
              />

              <ControlButton
                icon={<Monitor className="w-5 h-5 text-white" />}
                isActive={callState.screenSharing}
                onClick={toggleScreenShare}
                label={callState.screenSharing ? 'Stop sharing' : 'Share screen'}
              />

              <ControlButton
                icon={<PhoneOff className="w-5 h-5 text-white" />}
                isDanger
                onClick={handleEndCall}
                label="Leave call"
              />
            </motion.div>
          </div>
        ) : (
          // No active call - show placeholder
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
                <Video className="w-10 h-10 text-gray-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                No active call
              </h2>
              <p className="text-gray-400 mb-6">
                Start a video call to connect with others in this room
              </p>
              {numericRoomId ? (
                <button
                  onClick={handleStartCall}
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg transition-colors mx-auto"
                >
                  <Video className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Start Video Call</span>
                </button>
              ) : (
                <p className="text-gray-500 text-sm">Video calls not available (missing room data)</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
