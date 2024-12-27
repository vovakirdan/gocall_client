export class SFUClient {
    private ws: WebSocket | null = null;
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
  
    constructor(private url: string) {}
  
    async connect() {
      this.ws = new WebSocket(this.url);
  
      this.ws.onopen = () => {
        console.log("WebSocket connection established");
      };
  
      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
  
        switch (message.type) {
          case "answer":
            await this.peerConnection?.setRemoteDescription(
              new RTCSessionDescription(message.data)
            );
            console.log("Received answer from SFU");
            break;
  
          case "candidate":
            await this.peerConnection?.addIceCandidate(message.data);
            console.log("Received ICE candidate from SFU");
            break;
  
          case "tracks_available":
            this.subscribeToTracks(message.data);
            break;
  
          default:
            console.warn("Unknown message type:", message.type);
        }
      };
  
      this.ws.onclose = () => {
        console.log("WebSocket connection closed");
      };
  
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }
  
    async startConnection(localStream: MediaStream) {
      this.localStream = localStream;
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
  
      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
  
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.ws?.send(
            JSON.stringify({ type: "candidate", data: event.candidate })
          );
        }
      };
  
      // Handle remote tracks
      this.peerConnection.ontrack = (event) => {
        console.log("Received remote track:", event.streams[0]);
      };
  
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
  
      // Send offer to SFU
      this.ws?.send(
        JSON.stringify({ type: "offer", data: this.peerConnection.localDescription })
      );
    }
  
    async subscribeToTracks(tracks: any) {
      console.log("Available tracks:", tracks);
      // Example: Automatically subscribe to all tracks
      this.ws?.send(
        JSON.stringify({ type: "subscribe_tracks", data: Object.keys(tracks) })
      );
    }
  }
  