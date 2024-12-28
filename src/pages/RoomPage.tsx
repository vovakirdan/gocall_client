import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { SFUClient } from "../services/sfuClient";
import { getLocalStream } from "../services/mediaHandler";

const RoomPage: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const location = useLocation();
  const { roomName } = location.state as { roomName: string };
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

  useEffect(() => {
    const initialize = async () => {
      if (!roomID) {
        console.error("No roomID provided");
        return;
      }
      const stream = await getLocalStream();
      setLocalStream(stream);

      const sfuClient = new SFUClient("ws://localhost:8000/ws");
      await sfuClient.connect(roomID, roomName);
      await sfuClient.startConnection(stream);
    };

    initialize();
  }, [roomID]);

  return (
    <div className="room">
      <h1>Room: {roomID}</h1>
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
        <h2>Remote Streams</h2>
        {remoteStreams.map((stream, index) => (
          <video
            key={index}
            autoPlay
            playsInline
            ref={(video) => {
              if (video) video.srcObject = stream;
            }}
          ></video>
        ))}
      </div>
    </div>
  );
};

export default RoomPage;
