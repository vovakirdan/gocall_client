import React, { useEffect, useState } from "react";
import { SFUClient } from "../services/sfuClient";
import { getLocalStream } from "../services/mediaHandler";

const RoomPage: React.FC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const stream = await getLocalStream();
      setLocalStream(stream);

      const sfuClient = new SFUClient("ws://localhost:8000/ws");
      await sfuClient.connect();
      await sfuClient.startConnection(stream);
    };

    initialize();
  }, []);

  return (
    <div className="room">
      <h1>Room</h1>
      <div>
        <h2>Local Stream</h2>
        {localStream && (
          <video
            autoPlay
            muted
            playsInline
            ref={(video) => {
              if (video) video.srcObject = localStream;
            }}
          ></video>
        )}
      </div>
      <div>
        <h2>Remote Stream</h2>
        {remoteStream && (
          <video
            autoPlay
            playsInline
            ref={(video) => {
              if (video) video.srcObject = remoteStream;
            }}
          ></video>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
