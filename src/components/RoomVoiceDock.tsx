import React from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { useRoomVoice } from "../context/RoomVoiceContext";

const buttonClass =
  "w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-800 hover:bg-gray-700";

const RoomVoiceDock: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    toggleRoomVoiceMic,
    toggleRoomVoiceCamera,
    toggleRoomVoiceScreenShare,
    leaveRoomVoiceSession,
  } = useRoomVoice();

  if (state.status === "idle" || !state.roomId) {
    return null;
  }

  const encodedRoomId = encodeURIComponent(state.roomId);

  return (
    <div className="fixed right-6 bottom-6 z-40 w-[360px] rounded-2xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Room Voice
          </div>
          <div className="text-sm font-semibold text-white">{state.roomName || state.roomId}</div>
          <div className="text-xs text-white/60">
            {state.status === "connecting"
              ? "Connecting..."
              : `${state.participants.length} connected`}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(`/room/${encodedRoomId}`, {
              state: { roomName: state.roomName },
            })
          }
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-medium text-gray-950 transition-colors"
        >
          Open Room
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleRoomVoiceMic()}
            disabled={state.status !== "active"}
            className={buttonClass}
            title={state.localMuted ? "Unmute" : "Mute"}
          >
            {state.localMuted ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => void toggleRoomVoiceCamera()}
            disabled={state.status !== "active"}
            className={buttonClass}
            title={state.localCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {state.localCameraOff ? (
              <Video className="w-4 h-4 text-white" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => void toggleRoomVoiceScreenShare()}
            disabled={state.status !== "active"}
            className={buttonClass}
            title={state.screenSharing ? "Stop sharing" : "Share screen"}
          >
            {state.screenSharing ? (
              <MonitorOff className="w-4 h-4 text-red-400" />
            ) : (
              <Monitor className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void leaveRoomVoiceSession()}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-400 transition-colors"
          title="Leave voice"
        >
          <PhoneOff className="w-5 h-5 text-white" />
        </button>
      </div>

      {state.error && (
        <div className="px-4 pb-3 text-xs text-red-300">{state.error}</div>
      )}
    </div>
  );
};

export default RoomVoiceDock;
