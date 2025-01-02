interface CreateSfuClientParams {
  roomID: string;
  clientID?: string;  // если хотим явно задать clientID
  onClientID?: (id: string) => void;
  onStatus?: (msg: string) => void;
  onAddVideo?: (stream: MediaStream, streamId: string, isLocal: boolean) => void;
  onRemoveVideo?: (streamId: string) => void;
}

/**
 * Настройки для старта
 */
interface StartCallOptions {
  videoCodec: string; // "h264" | "vp9" | ""
  viewOnly: boolean;
}

export function createSfuClient(params: CreateSfuClientParams) {
  let ws: WebSocket | null = null;
  let pc: RTCPeerConnection | null = null;

  // Для хранения локальных стримов, чтобы потом убивать их корректно
  const localStreams: MediaStream[] = [];

  function logStatus(message: string) {
    if (params.onStatus) {
      params.onStatus(message);
    }
  }

  /**
   * Запуск WebSocket соединения
   */
  async function startWebSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!params.roomID) {
        return reject("No roomID provided");
      }

      // Собираем query - room_id и client_id
      const queryParts = [`room_id=${encodeURIComponent(params.roomID)}`];
      if (params.clientID) {
        queryParts.push(`client_id=${encodeURIComponent(params.clientID)}`);
      }
      // Для примера - debug
      // queryParts.push("debug=1");

      const wsUrl = `ws://localhost:8000/ws?${queryParts.join("&")}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logStatus("WebSocket opened");
        resolve();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        logStatus("WebSocket error");
        reject(err);
      };

      ws.onclose = () => {
        logStatus("WebSocket closed");
      };

      // Обработка входящих сообщений
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.type) return;

        switch (msg.type) {
          case "clientid": {
            if (params.onClientID) {
              params.onClientID(msg.data);
            }
            break;
          }
          case "offer": {
            if (!pc) return;
            await pc.setRemoteDescription(msg.data);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // отсылаем answer
            ws?.send(JSON.stringify({ type: "answer", data: answer.sdp }));
            break;
          }
          case "answer": {
            if (!pc) return;
            await pc.setRemoteDescription(msg.data);
            break;
          }
          case "candidate": {
            if (!pc) return;
            const candidateInit = msg.data;
            await pc.addIceCandidate(candidateInit);
            break;
          }
          case "tracks_available": {
            // Пример: тут можно отправить subscribe_tracks
            // Но в index.html оно делалось автоматически
            console.log("tracks_available:", msg.data);
            break;
          }
          case "tracks_added": {
            // Ответ на подтверждение, что отправленные треки зарегистрированы
            console.log("tracks_added:", msg.data);
            break;
          }
          case "track_stats":
            // do nothing
            // console.log("recieved track stats:", msg.data) // todo show it on the client
            break;
          default: {
            console.log("Unknown message type:", msg);
            break;
          }
        }
      };
    });
  }

  /**
   * Старт вебRTC
   */
  async function startCall(options: StartCallOptions): Promise<void> {
    if (!ws) {
      logStatus("WebSocket not started");
      return;
    }
    if (pc) {
      logStatus("PeerConnection already created. Negotiation might be repeated.");
    }

    // Создаем новый RTCPeerConnection
    pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    // ICE candidate
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        ws?.send(JSON.stringify({ type: "candidate", data: ev.candidate.candidate }));
      }
    };

    // Когда трек приходит
    pc.ontrack = (ev) => {
      ev.streams.forEach((str) => {
        if (params.onAddVideo) {
          params.onAddVideo(str, str.id, false /* isLocal */);
        }

        // Удаляем видео, если трек пропал
        str.onremovetrack = (evt) => {
          const track = evt.track;
          if (track.readyState === "ended") {
            if (params.onRemoveVideo) {
              params.onRemoveVideo(str.id);
            }
          }
        };
      });
    };

    // Если мы не ViewOnly, то добавляем наши треки
    if (!options.viewOnly) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        localStreams.push(mediaStream);

        // Сообщаем компоненту, что добавился локальный стрим
        if (params.onAddVideo) {
          params.onAddVideo(mediaStream, mediaStream.id, true);
        }

        // Добавляем треки в PeerConnection
        for (const track of mediaStream.getTracks()) {
          const sender = pc.addTrack(track, mediaStream);
          // Важно: настройка кодеков / simulcast может быть тут
          if (options.videoCodec && track.kind === "video") {
            // Пример как можно подменить кодек:
            // (не все браузеры поддерживают setCodecPreferences)
            // ...
          }
        }
      } catch (error) {
        console.error("Failed to getUserMedia:", error);
      }
    } else {
      // Иначе вообще не добавляем локальные треки (ViewOnly = receive only)
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    // Создаем offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Отправляем offer
    ws.send(JSON.stringify({ type: "offer", data: offer.sdp }));
  }

  function close() {
    // Закрываем WS
    if (ws) {
      ws.close();
      ws = null;
    }

    // Закрываем PC
    if (pc) {
      pc.close();
      pc = null;
    }

    // Останавливаем локальные треки
    localStreams.forEach((s) => {
      s.getTracks().forEach((t) => t.stop());
    });
    localStreams.splice(0, localStreams.length);
  }

  return {
    startWebSocket,
    startCall,
    close,
  };
}