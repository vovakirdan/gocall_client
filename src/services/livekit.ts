/**
 * LiveKit Service
 * Wraps LiveKit SDK for video/audio calls
 */

import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalTracks,
  VideoPresets,
} from 'livekit-client';

// === Types ===

export interface LiveKitCredentials {
  url: string;
  token: string;
  roomName: string;
}

export interface TrackInfo {
  trackSid: string;
  participantId: string;
  participantName: string;
  kind: 'video' | 'audio';
  isLocal: boolean;
  track: Track;
}

export interface ParticipantInfo {
  sid: string;
  identity: string;
  name: string;
  isLocal: boolean;
  videoTrack?: Track;
  audioTrack?: Track;
  isMuted: boolean;
  isCameraOff: boolean;
}

export type LiveKitConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// === Event Handlers ===

export interface LiveKitEventHandlers {
  // Connection events
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onConnectionStateChanged?: (state: LiveKitConnectionState) => void;

  // Track events
  onLocalTrackPublished?: (track: TrackInfo) => void;
  onLocalTrackUnpublished?: (track: TrackInfo) => void;
  onTrackSubscribed?: (track: TrackInfo) => void;
  onTrackUnsubscribed?: (track: TrackInfo) => void;
  onTrackMuted?: (track: TrackInfo) => void;
  onTrackUnmuted?: (track: TrackInfo) => void;

  // Participant events
  onParticipantConnected?: (participant: ParticipantInfo) => void;
  onParticipantDisconnected?: (participant: ParticipantInfo) => void;

  // Media state
  onMicMuted?: (muted: boolean) => void;
  onCameraMuted?: (muted: boolean) => void;
  onScreenShareStarted?: () => void;
  onScreenShareStopped?: () => void;

  // Errors
  onError?: (error: Error) => void;
}

// === LiveKit Client ===

export class LiveKitClient {
  private room: Room | null = null;
  private handlers: LiveKitEventHandlers = {};
  private credentials: LiveKitCredentials | null = null;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private screenShareTrack: LocalVideoTrack | null = null;
  private isMicMuted = false;
  private isCameraMuted = false;
  private isScreenSharing = false;

  // === Connection Management ===

  async connect(credentials: LiveKitCredentials): Promise<void> {
    if (this.room) {
      await this.disconnect();
    }

    this.credentials = credentials;
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    this.setupEventListeners();

    try {
      await this.room.connect(credentials.url, credentials.token);
      this.handlers.onConnected?.();
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    // Unpublish local tracks
    await this.stopCamera();
    await this.stopMic();
    await this.stopScreenShare();

    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }

    this.credentials = null;
    this.handlers.onDisconnected?.();
  }

  private setupEventListeners(): void {
    if (!this.room) return;

    // Connection state
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      const mappedState = this.mapConnectionState(state);
      this.handlers.onConnectionStateChanged?.(mappedState);

      if (state === ConnectionState.Reconnecting) {
        this.handlers.onReconnecting?.();
      } else if (state === ConnectionState.Connected && this.credentials) {
        this.handlers.onReconnected?.();
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.handlers.onDisconnected?.();
    });

    // Track events
    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      const trackInfo = this.createTrackInfo(track, participant, false);
      this.handlers.onTrackSubscribed?.(trackInfo);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      const trackInfo = this.createTrackInfo(track, participant, false);
      this.handlers.onTrackUnsubscribed?.(trackInfo);
    });

    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (publication.track && participant) {
        const trackInfo = this.createTrackInfo(
          publication.track,
          participant as RemoteParticipant | LocalParticipant,
          participant === this.room?.localParticipant
        );
        this.handlers.onTrackMuted?.(trackInfo);
      }
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (publication.track && participant) {
        const trackInfo = this.createTrackInfo(
          publication.track,
          participant as RemoteParticipant | LocalParticipant,
          participant === this.room?.localParticipant
        );
        this.handlers.onTrackUnmuted?.(trackInfo);
      }
    });

    this.room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
      if (publication.track) {
        const trackInfo = this.createTrackInfo(publication.track, participant, true);
        this.handlers.onLocalTrackPublished?.(trackInfo);
      }
    });

    this.room.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
      if (publication.track) {
        const trackInfo = this.createTrackInfo(publication.track, participant, true);
        this.handlers.onLocalTrackUnpublished?.(trackInfo);
      }
    });

    // Participant events
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      const info = this.createParticipantInfo(participant, false);
      this.handlers.onParticipantConnected?.(info);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      const info = this.createParticipantInfo(participant, false);
      this.handlers.onParticipantDisconnected?.(info);
    });
  }

  private mapConnectionState(state: ConnectionState): LiveKitConnectionState {
    switch (state) {
      case ConnectionState.Connected:
        return 'connected';
      case ConnectionState.Connecting:
        return 'connecting';
      case ConnectionState.Reconnecting:
        return 'reconnecting';
      default:
        return 'disconnected';
    }
  }

  private createTrackInfo(
    track: Track | LocalTrack | RemoteTrack,
    participant: RemoteParticipant | LocalParticipant,
    isLocal: boolean
  ): TrackInfo {
    return {
      trackSid: track.sid || '',
      participantId: participant.sid,
      participantName: participant.name || participant.identity,
      kind: track.kind === Track.Kind.Video ? 'video' : 'audio',
      isLocal,
      track,
    };
  }

  private createParticipantInfo(
    participant: RemoteParticipant | LocalParticipant,
    isLocal: boolean
  ): ParticipantInfo {
    const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
    const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
    const videoPublication = screenSharePublication || cameraPublication;
    const videoTrack = videoPublication?.track;
    const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track;

    return {
      sid: participant.sid,
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal,
      videoTrack: videoTrack || undefined,
      audioTrack: audioTrack || undefined,
      isMuted: participant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true,
      isCameraOff: videoPublication?.isMuted ?? true,
    };
  }

  private handleError(error: Error): void {
    console.error('LiveKit error:', error);
    this.handlers.onError?.(error);
  }

  // === Media Controls ===

  async enableCamera(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to a room');
    }

    try {
      if (!this.localVideoTrack) {
        const tracks = await createLocalTracks({
          video: { resolution: VideoPresets.h720.resolution },
          audio: false,
        });
        this.localVideoTrack = tracks.find(
          (t) => t.kind === Track.Kind.Video
        ) as LocalVideoTrack | undefined ?? null;
      }

      if (this.localVideoTrack) {
        await this.room.localParticipant.publishTrack(this.localVideoTrack);
        this.isCameraMuted = false;
        this.handlers.onCameraMuted?.(false);
      }
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async disableCamera(): Promise<void> {
    if (this.localVideoTrack && this.room) {
      await this.room.localParticipant.unpublishTrack(this.localVideoTrack);
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
      this.isCameraMuted = true;
      this.handlers.onCameraMuted?.(true);
    }
  }

  async toggleCamera(): Promise<boolean> {
    if (this.isCameraMuted) {
      await this.enableCamera();
    } else {
      await this.disableCamera();
    }
    return !this.isCameraMuted;
  }

  async enableMic(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to a room');
    }

    try {
      if (!this.localAudioTrack) {
        const tracks = await createLocalTracks({
          video: false,
          audio: true,
        });
        this.localAudioTrack = tracks.find(
          (t) => t.kind === Track.Kind.Audio
        ) as LocalAudioTrack | undefined ?? null;
      }

      if (this.localAudioTrack) {
        await this.room.localParticipant.publishTrack(this.localAudioTrack);
        this.isMicMuted = false;
        this.handlers.onMicMuted?.(false);
      }
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async disableMic(): Promise<void> {
    if (this.localAudioTrack && this.room) {
      await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
      this.isMicMuted = true;
      this.handlers.onMicMuted?.(true);
    }
  }

  async toggleMic(): Promise<boolean> {
    if (this.isMicMuted) {
      await this.enableMic();
    } else {
      await this.disableMic();
    }
    return !this.isMicMuted;
  }

  async startScreenShare(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to a room');
    }

    if (this.isScreenSharing) {
      return;
    }

    try {
      const screenTrack = await this.room.localParticipant.setScreenShareEnabled(true);
      if (screenTrack) {
        // setScreenShareEnabled returns LocalTrackPublication, extract the track
        const track = (screenTrack as unknown as { track?: LocalVideoTrack }).track;
        if (track) {
          this.screenShareTrack = track;
        }
        this.isScreenSharing = true;
        this.handlers.onScreenShareStarted?.();
      }
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.room || !this.isScreenSharing) {
      return;
    }

    await this.room.localParticipant.setScreenShareEnabled(false);
    this.screenShareTrack = null;
    this.isScreenSharing = false;
    this.handlers.onScreenShareStopped?.();
  }

  async toggleScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
    return this.isScreenSharing;
  }

  private async stopCamera(): Promise<void> {
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
    this.isCameraMuted = true;
  }

  private async stopMic(): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    this.isMicMuted = true;
  }

  // === Getters ===

  getRoom(): Room | null {
    return this.room;
  }

  getLocalParticipant(): LocalParticipant | undefined {
    return this.room?.localParticipant;
  }

  getRemoteParticipants(): RemoteParticipant[] {
    if (!this.room) return [];
    return Array.from(this.room.remoteParticipants.values());
  }

  getAllParticipants(): ParticipantInfo[] {
    if (!this.room) return [];

    const participants: ParticipantInfo[] = [];

    // Add local participant
    if (this.room.localParticipant) {
      participants.push(this.createParticipantInfo(this.room.localParticipant, true));
    }

    // Add remote participants
    this.room.remoteParticipants.forEach((p) => {
      participants.push(this.createParticipantInfo(p, false));
    });

    return participants;
  }

  getLocalVideoTrack(): LocalVideoTrack | null {
    return this.screenShareTrack || this.localVideoTrack;
  }

  getLocalAudioTrack(): LocalAudioTrack | null {
    return this.localAudioTrack;
  }

  getScreenShareTrack(): LocalVideoTrack | null {
    return this.screenShareTrack;
  }

  isMicEnabled(): boolean {
    return !this.isMicMuted;
  }

  isCameraEnabled(): boolean {
    return !this.isCameraMuted;
  }

  isScreenShareEnabled(): boolean {
    return this.isScreenSharing;
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  // === Event Handler Management ===

  setHandlers(handlers: LiveKitEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  clearHandlers(): void {
    this.handlers = {};
  }
}

// === Factory ===

export function createLiveKitClient(): LiveKitClient {
  return new LiveKitClient();
}
