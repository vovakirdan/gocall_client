import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useSFUClient } from "../context/SFUClientContext";

const RoomPage: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const location = useLocation();
  const { roomName } = location.state as { roomName: string };
  const sfuClient = useSFUClient();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const initialize = async () => {
      if (!roomID) {
        console.error('No roomID provided');
        setError('No roomID provided');
        return;
      }
      try {
        const stream = await sfuClient.getLocalStream();
        setLocalStream(stream);
        await sfuClient.startConnection(stream);

        // Обработка добавления удалённых треков
        const handleTrack = (stream: MediaStream) => {
          setRemoteStreams((prev) => {
            // Проверка на уникальность
            if (prev.find((s) => s.id === stream.id)) {
              return prev;
            }
            return [...prev, stream];
          });
        };

        sfuClient.on('track', handleTrack);

        // Обработка ошибок
        const handleError = (errorMessage: string) => {
          console.error('Connection error:', errorMessage);
          setError(`Connection error: ${errorMessage}`);
        };

        sfuClient.on('error', handleError);

        // Обработка состояния соединения
        const handleConnectionStateChange = (state: string) => {
          console.log('Connection state:', state);
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            setError('Connection closed');
          }
        };

        sfuClient.on('connectionStateChange', handleConnectionStateChange);

        // Очистка подписок при размонтировании компонента
        return () => {
          sfuClient.off('track', handleTrack);
          sfuClient.off('error', handleError);
          sfuClient.off('connectionStateChange', handleConnectionStateChange);
          sfuClient.close();
        };
      } catch (err) {
        console.error('Failed to initialize connection:', err);
        setError('Failed to initialize connection');
      }
    };

    initialize();
  }, [roomID, roomName, sfuClient]);

  return (
    <div className="room">
      <h1>Room: {roomName} (ID: {roomID})</h1>
      {error && <p className="text-red-500">{error}</p>}
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
            style={{ width: '300px' }}
          ></video>
        )}
      </div>
      <div>
        <h2>Remote Streams</h2>
        {remoteStreams.map((stream, index) => (
          <video
            key={stream.id}
            autoPlay
            playsInline
            ref={(video) => {
              if (video) video.srcObject = stream;
            }}
            style={{ width: '300px' }}
          ></video>
        ))}
      </div>
    </div>
  );
};

export default RoomPage;
