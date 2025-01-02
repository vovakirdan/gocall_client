import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createSfuClient } from "../services/sfuClient";

export default function RoomPage(): JSX.Element {
  const { roomID } = useParams(); // берем roomID из маршрута /room/:roomID
  const [status, setStatus] = useState<string>("Idle");
  const [clientID, setClientID] = useState<string>("");
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Храним экземпляр sfuClient, чтобы вызывать методы
  const sfuClientRef = useRef<ReturnType<typeof createSfuClient> | null>(null);

  // Стартуем соединение, когда компонент монтируется
  useEffect(() => {
    if (!roomID) {
      setStatus("No room ID");
      return;
    }

    // Создаем экземпляр sfuClient
    const sfuClient = createSfuClient({
      roomID,
      onClientID: (id) => setClientID(id),
      onStatus: (msg) => setStatus(msg),
      onAddVideo: handleAddVideo,
      onRemoveVideo: handleRemoveVideo,
    });

    sfuClientRef.current = sfuClient;

    // Инициируем подключение WebSocket
    sfuClient.startWebSocket().then(() => {
      // Успешно открыли WS
      setStatus("WebSocket opened");
    }).catch((err) => {
      setStatus("WebSocket error");
      console.error(err);
    });

    // Выполняем очистку соединения при размонтировании
    return () => {
      sfuClient.close();
    };
  }, [roomID]);

  /**
   * Пример обработчика для добавления видео-элементов.
   * @param stream {MediaStream}
   * @param streamId {string}
   * @param isLocal {boolean}
   */
  function handleAddVideo(stream: MediaStream, streamId: string, isLocal: boolean): void {
    if (!videoContainerRef.current) return;
    // Создаем контейнер
    const container = document.createElement("div");
    container.id = `container-${streamId}`;
    container.style.position = "relative";

    // Создаем video
    const videoEl = document.createElement("video");
    videoEl.id = `video-${streamId}`;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = isLocal; // если наш собственный стрим — мьютим, чтобы не дублировать звук
    videoEl.srcObject = stream;

    container.appendChild(videoEl);
    videoContainerRef.current.appendChild(container);
  }

  /**
   * Пример обработчика для удаления видео-элементов.
   * @param streamId {string}
   */
  function handleRemoveVideo(streamId: string): void {
    if (!videoContainerRef.current) return;
    const container = document.getElementById(`container-${streamId}`);
    if (container) {
      videoContainerRef.current.removeChild(container);
    }
  }

  // Небольшие кнопки для «View Only», «Start H264», и т.д.
  const startH264 = () => {
    sfuClientRef.current?.startCall({ videoCodec: "h264", viewOnly: false });
  };

  const startVP9 = () => {
    sfuClientRef.current?.startCall({ videoCodec: "vp9", viewOnly: false });
  };

  const viewOnly = () => {
    sfuClientRef.current?.startCall({ videoCodec: "", viewOnly: true });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div style={{ padding: "1rem" }}>
        <h2>Room: {roomID}</h2>
        <p>Status: {status}</p>
        <p>ClientID: {clientID}</p>
        <button onClick={startH264}>Start H264</button>
        <button onClick={startVP9}>Start VP9</button>
        <button onClick={viewOnly}>View Only</button>
      </div>

      <div ref={videoContainerRef} style={{ flex: 1, background: "#ccc" }}>
        {/* Video elements will be added here */}
      </div>
    </div>
  );
}