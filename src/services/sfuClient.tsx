import EventEmitter from 'eventemitter3';

interface ResponseMessage {
  status: boolean;
  type: string;
  data: any;
}

interface SubscribeTrack {
  client_id: string;
  track_id: string;
}

export class SFUClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection;
  private clientID: string = '';
  private roomID: string = '';
  private roomName: string = '';
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();

  constructor(wsUrl: string) {
    super();
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    // Обработка ICE кандидатов
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage('candidate', {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        });
      }
    };

    // Обработка добавления треков
    this.peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.emit('track', stream);
        this.remoteStreams.set(stream.id, stream);
      }
    };

    // Обработка состояния соединения
    this.peerConnection.onconnectionstatechange = () => {
      this.emit('connectionStateChange', this.peerConnection.connectionState);
      if (
        this.peerConnection.connectionState === 'disconnected' ||
        this.peerConnection.connectionState === 'failed' ||
        this.peerConnection.connectionState === 'closed'
      ) {
        this.emit('closed');
      }
    };
  }

  /**
   * Подключение к WebSocket-серверу и присоединение к комнате
   * @param roomID Идентификатор комнаты
   * @param roomName Название комнаты
   */
  public connect = (roomID: string, roomName: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:8000/ws');

      this.ws.onopen = () => {
        console.log('WebSocket connection opened');
        this.sendMessage('join_room', { roomID, roomName });
        this.roomID = roomID;
        this.roomName = roomName;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message: ResponseMessage = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', 'WebSocket error');
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.emit('close');
      };
    });
  };

  /**
   * Отправка сообщения через WebSocket
   * @param type Тип сообщения
   * @param data Данные сообщения
   */
  private sendMessage = (type: string, data: any) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      this.ws.send(message);
    } else {
      console.error('WebSocket is not open. Cannot send message:', type);
    }
  };

  /**
   * Обработка входящих сообщений от сервера
   * @param message Входящее сообщение
   */
  private handleMessage = (message: ResponseMessage) => {
    switch (message.type) {
      case 'client_id':
        this.clientID = message.data;
        this.emit('client_id', this.clientID);
        break;

      case 'offer':
        this.handleOffer(message.data);
        break;

      case 'answer':
        this.handleAnswer(message.data);
        break;

      case 'candidate':
        this.handleCandidate(message.data);
        break;

      case 'tracks_added':
        this.handleTracksAdded(message.data);
        break;

      case 'tracks_available':
        this.handleTracksAvailable(message.data);
        break;

      case 'network_condition':
        this.handleNetworkCondition(message.data);
        break;

      case 'error':
        this.emit('error', message.data);
        break;

      // Добавьте обработку других типов сообщений по необходимости

      default:
        console.warn('Unknown message type:', message.type);
    }
  };

  /**
   * Обработка предложения (offer) от сервера
   * @param offer SDP предложение
   */
  private handleOffer = async (offer: any) => {
    try {
      const remoteDesc = new RTCSessionDescription({
        type: 'offer',
        sdp: offer.sdp,
      });
      await this.peerConnection.setRemoteDescription(remoteDesc);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendMessage('answer', { type: 'answer', sdp: answer.sdp });
    } catch (error) {
      console.error('Failed to handle offer:', error);
      this.emit('error', 'Failed to handle offer');
    }
  };

  /**
   * Обработка ответа (answer) от сервера
   * @param answer SDP ответ
   */
  private handleAnswer = async (answer: any) => {
    try {
      const remoteDesc = new RTCSessionDescription({
        type: 'answer',
        sdp: answer.sdp,
      });
      await this.peerConnection.setRemoteDescription(remoteDesc);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      this.emit('error', 'Failed to handle answer');
    }
  };

  /**
   * Обработка ICE кандидата от сервера
   * @param candidate ICE кандидат
   */
  private handleCandidate = async (candidate: any) => {
    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
      });
      await this.peerConnection.addIceCandidate(iceCandidate);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      this.emit('error', 'Failed to add ICE candidate');
    }
  };

  /**
   * Обработка сообщения о добавленных треках
   * @param data Данные о треках
   */
  private handleTracksAdded = (data: any) => {
    this.emit('tracks_added', data);
  };

  /**
   * Обработка сообщения о доступных треках
   * @param tracks Доступные треки
   */
  private handleTracksAvailable = (tracks: any) => {
    // Пример обработки: подписка на все доступные треки
    const subscribeTracks: SubscribeTrack[] = Object.values(tracks).map((track: any) => ({
      client_id: track.client_id,
      track_id: track.track_id, // Убедитесь, что это правильный идентификатор трека
    }));
    this.sendMessage('subscribe_tracks', subscribeTracks);
  };

  /**
   * Обработка сообщения о состоянии сети
   * @param condition Состояние сети
   */
  private handleNetworkCondition = (condition: any) => {
    this.emit('network_condition', condition);
  };

  /**
   * Получение локального медиа-потока
   * @returns Локальный MediaStream
   */
  public getLocalStream = async (): Promise<MediaStream> => {
    if (this.localStream) {
      return this.localStream;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this.localStream = stream;
      // Добавление треков в PeerConnection
      stream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, stream);
      });
      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  };

  /**
   * Старт подключения, создаёт и отправляет предложение
   * @param stream Локальный MediaStream
   */
  public startConnection = async (stream: MediaStream) => {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendMessage('offer', { type: 'offer', sdp: offer.sdp });
    } catch (error) {
      console.error('Failed to start connection:', error);
      this.emit('error', 'Failed to start connection');
    }
  };

  /**
   * Подписка на определённые треки
   * @param tracks Треки для подписки
   */
  public subscribeTracks = (tracks: SubscribeTrack[]) => {
    this.sendMessage('subscribe_tracks', tracks);
  };

  /**
   * Переключение качества видео
   * @param quality Желаемое качество
   */
  public switchQuality = (quality: string) => {
    this.sendMessage('switch_quality', quality);
  };

  /**
   * Обновление пропускной способности публикации
   * @param bandwidth Новая пропускная способность
   */
  public updateBandwidth = (bandwidth: number) => {
    this.sendMessage('update_bandwidth', bandwidth);
  };

  /**
   * Установка лимита пропускной способности приёма
   * @param bandwidth Лимит пропускной способности
   */
  public setBandwidthLimit = (bandwidth: number) => {
    this.sendMessage('set_bandwidth_limit', bandwidth.toString());
  };

  /**
   * Проверка возможности перенастройки (renegotiation)
   */
  public checkRenegotiation = () => {
    this.sendMessage('is_allow_renegotiation', null);
  };

  /**
   * Закрытие соединения
   */
  public close = () => {
    if (this.ws) {
      this.ws.close();
    }
    this.peerConnection.close();
    this.emit('close');
  };

  /**
   * Получение всех удалённых потоков
   * @returns Массив MediaStream
   */
  public getRemoteStreams = (): MediaStream[] => {
    return Array.from(this.remoteStreams.values());
  };
}
