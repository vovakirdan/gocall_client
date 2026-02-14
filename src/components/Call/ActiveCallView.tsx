/**
 * Active Call View
 * Full screen overlay showing video call with controls
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';
import { AudioTrack, Track, VideoTrack } from 'livekit-client';

// Video tile for a participant
interface VideoTileProps {
  track?: Track | null;
  audioTrack?: Track | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  volumePercent?: number;
  onVolumeChange?: (volumePercent: number) => void;
  onResetVolume?: () => void;
}

const VideoTile: React.FC<VideoTileProps> = ({
  track,
  audioTrack,
  name,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  volumePercent = 100,
  onVolumeChange,
  onResetVolume,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumePercentRef = useRef<number>(volumePercent);
  const [showVolumeControls, setShowVolumeControls] = useState(false);

  useEffect(() => {
    volumePercentRef.current = volumePercent;

    if (isLocal || !audioRef.current) {
      return;
    }

    const clamped = Math.min(100, Math.max(0, volumePercent));
    audioRef.current.volume = clamped / 100;
  }, [volumePercent, isLocal]);

  useEffect(() => {
    if (videoRef.current && track) {
      const videoTrack = track as VideoTrack;
      videoTrack.attach(videoRef.current);

      return () => {
        videoTrack.detach(videoRef.current!);
      };
    }
  }, [track]);

  useEffect(() => {
    if (isLocal || !audioRef.current || !audioTrack) {
      return;
    }

    const remoteAudioTrack = audioTrack as AudioTrack;
    const audioEl = audioRef.current;
    // Apply volume before attaching to avoid an initial "full volume" blip.
    const clamped = Math.min(100, Math.max(0, volumePercentRef.current));
    audioEl.volume = clamped / 100;
    remoteAudioTrack.attach(audioEl);

    return () => {
      remoteAudioTrack.detach(audioEl);
    };
  }, [audioTrack, isLocal]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {track && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1.5">
        <span className="text-white text-sm font-medium">
          {isLocal ? 'You' : name}
        </span>
        {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
      </div>

      {/* Per-participant volume (remote only) */}
      {!isLocal && (
        <div className="absolute top-3 right-3">
          <div
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 bg-black/50 backdrop-blur-sm ${
              showVolumeControls ? 'ring-1 ring-white/10' : ''
            }`}
          >
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => setShowVolumeControls((v) => !v)}
              aria-label={`${showVolumeControls ? 'Hide' : 'Show'} volume controls for ${name}`}
              title="Participant volume"
            >
              {volumePercent <= 0 ? (
                <VolumeX className="w-4 h-4 text-white/90" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/90" />
              )}
            </button>

            {showVolumeControls && (
              <>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.min(100, Math.max(0, volumePercent))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (audioRef.current) {
                      const clamped = Math.min(100, Math.max(0, next));
                      audioRef.current.volume = clamped / 100;
                    }
                    onVolumeChange?.(next);
                  }}
                  className="w-28 accent-primary"
                  aria-label={`Volume for ${name}`}
                />
                <span className="text-xs text-white/80 tabular-nums w-10 text-right">
                  {Math.min(100, Math.max(0, volumePercent))}%
                </span>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.volume = 1;
                    }
                    onResetVolume?.();
                  }}
                  aria-label={`Reset volume for ${name}`}
                  title="Reset volume"
                >
                  <RotateCcw className="w-4 h-4 text-white/80" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 right-3 bg-primary rounded-lg px-2 py-1">
          <span className="text-xs font-medium text-white">You</span>
        </div>
      )}
    </div>
  );
};

// Call duration timer
const CallTimer: React.FC<{ startTime: number | null }> = ({ startTime }) => {
  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setDuration(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-white/80 font-mono text-lg">{duration}</span>
  );
};

// Control button
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
  const baseClasses = 'w-14 h-14 rounded-full flex items-center justify-center transition-all';
  const colorClasses = isDanger
    ? 'bg-red-500 hover:bg-red-600'
    : isActive
    ? 'bg-white/20 hover:bg-white/30'
    : 'bg-white/10 hover:bg-white/20';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${colorClasses} group relative`}
      title={label}
    >
      {isActive && activeIcon ? activeIcon : icon}
      {/* Tooltip */}
      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};

// Main component
const ActiveCallView: React.FC = () => {
  const {
    state,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    livekitClient,
    getRemoteParticipants,
    getParticipantVolume,
    setParticipantVolume,
    resetParticipantVolume,
  } = useCall();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Hide controls after inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetControlsTimeout();

    const handleMouseMove = () => resetControlsTimeout();
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (state.status !== 'active' && state.status !== 'connecting') {
    return null;
  }

  const participants = getRemoteParticipants();
  const localVideoTrack = livekitClient?.getLocalVideoTrack();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
        onMouseMove={() => setShowControls(true)}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
          className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              <span>{participants.length + 1}</span>
            </div>
            <CallTimer startTime={state.startTime} />
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" />
            )}
          </button>
        </motion.div>

        {/* Video grid */}
        <div className="flex-1 p-4 pt-20 pb-28">
          {state.status === 'connecting' ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-lg">Connecting to call...</p>
              </div>
            </div>
          ) : (
            <div
              className={`h-full grid gap-4 ${
                participants.length === 0
                  ? 'grid-cols-1'
                  : participants.length === 1
                  ? 'grid-cols-2'
                  : participants.length <= 3
                  ? 'grid-cols-2 grid-rows-2'
                  : 'grid-cols-3 grid-rows-2'
              }`}
            >
              {/* Local video */}
              <VideoTile
                track={localVideoTrack}
                name="You"
                isLocal
                isMuted={state.localMuted}
                isCameraOff={state.localCameraOff}
              />

              {/* Remote participants */}
              {participants.map((p) => (
                <VideoTile
                  key={p.sid}
                  track={p.videoTrack || null}
                  audioTrack={p.audioTrack || null}
                  name={p.name}
                  isMuted={p.isMuted}
                  isCameraOff={p.isCameraOff}
                  volumePercent={getParticipantVolume(p.identity)}
                  onVolumeChange={(v) => setParticipantVolume(p.identity, v)}
                  onResetVolume={() => resetParticipantVolume(p.identity)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
          className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 bg-gradient-to-t from-black/50 to-transparent"
        >
          <ControlButton
            icon={<Mic className="w-6 h-6 text-white" />}
            activeIcon={<MicOff className="w-6 h-6 text-red-400" />}
            isActive={state.localMuted}
            onClick={toggleMic}
            label={state.localMuted ? 'Unmute' : 'Mute'}
          />

          <ControlButton
            icon={<Video className="w-6 h-6 text-white" />}
            activeIcon={<VideoOff className="w-6 h-6 text-red-400" />}
            isActive={state.localCameraOff}
            onClick={toggleCamera}
            label={state.localCameraOff ? 'Turn on camera' : 'Turn off camera'}
          />

          <ControlButton
            icon={<Monitor className="w-6 h-6 text-white" />}
            activeIcon={<MonitorOff className="w-6 h-6 text-primary" />}
            isActive={state.screenSharing}
            onClick={toggleScreenShare}
            label={state.screenSharing ? 'Stop sharing' : 'Share screen'}
          />

          <ControlButton
            icon={<PhoneOff className="w-6 h-6 text-white" />}
            isDanger
            onClick={endCall}
            label="End call"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ActiveCallView;
