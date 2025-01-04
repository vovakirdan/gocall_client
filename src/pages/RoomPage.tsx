import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { InliveVideoObserver } from '../services/inlive-video-observer';

interface ExtendedEncodingParameters extends RTCRtpEncodingParameters {
  scalabilityMode?: string;
}

export default function RoomPage(): JSX.Element {
  const { roomID } = useParams();
    // The entire setup logic from the <script> goes into useEffect
    useEffect(() => {
        // ----------------------------------------------------------------
        // script. Minimal changes have been made to ensure it runs in React.
        // ----------------------------------------------------------------
        let clientid: string | null = null;
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                },
            ]
        });

        let ws: WebSocket | null = null;
        const stream = new MediaStream();
        let screenStream: MediaStream | null = null;
        let internalChannel: RTCDataChannel | null = null;
        let videoObserver: InliveVideoObserver | null = null;
        let red = true;
        let negotiationNeeded = false;
        let mutedMic = false;
        let mutedCam = false;

        // For controlling bandwidth
        let prevHighBytesSent = 0;
        let prevMidBytesSent = 0;
        let prevLowBytesSent = 0;

        const bwController: Record<string, number> = {
            low: 0,
            mid: 0,
            high: 0,
            available: 0
        };

        // -------------------------------------------
        //  WebSocket setup
        // -------------------------------------------
        const startWs = async () => {
            let debug = false;
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('debug')) {
                debug = true;
            }

            if (urlParams.has('disablered')) {
                red = false;
            }

            ws = new WebSocket(`ws://localhost:8000/ws?room_id=${roomID}${debug ? 'debug=1' : ''}`);
            const promise = new Promise<void>((resolve, reject) => {
                if (!ws) return;
                ws.onopen = function () {
                    resolve();
                };
                ws.onerror = function (err) {
                    reject(err);
                };
            });

            if (!ws) return promise;

            ws.onmessage = async (e) => {
                const msg = JSON.parse(e.data);
                try {
                    if (msg.type === 'clientid') {
                        clientid = msg.data;
                        const el = document.getElementById("clientid");
                        if (el) el.innerText = "ClientID: " + clientid;
                    } else if (msg.type === 'network_condition') {
                        const el = document.getElementById("network");
                        if (el) el.innerText = msg.data === 0 ? 'Unstable' : 'Stable';
                    } else if (msg.type === 'offer') {
                        await peerConnection.setRemoteDescription(msg.data);
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        if (ws) ws.send(JSON.stringify({ type: 'answer', data: answer.sdp }));
                        negotiationNeeded = false;
                    } else if (msg.type === 'answer') {
                        await peerConnection.setRemoteDescription(msg.data);
                        negotiationNeeded = false;
                    } else if (msg.type === 'candidate') {
                        await peerConnection.addIceCandidate(msg.data);
                    } else if (msg.type === 'tracks_added') {
                        // We respond with "media" type for all tracks for demonstration
                        const trackType: Record<string, string> = {};
                        const tracksAdded = msg.data;
                        Object.keys(tracksAdded).forEach(uid => {
                            trackType[uid] = "media";
                        });
                        if (ws) ws.send(JSON.stringify({ type: 'tracks_added', data: trackType }));
                    } else if (msg.type === 'tracks_available') {
                        // Subscribe to all tracks
                        const subTracks: Array<{ client_id: string; track_id: string }> = [];
                        const availableTracks = msg.data;
                        Object.keys(availableTracks).forEach(uid => {
                            const track = availableTracks[uid];
                            subTracks.push({
                                client_id: track.client_id,
                                track_id: track.id
                            });
                        });
                        if (ws) ws.send(JSON.stringify({ type: 'subscribe_tracks', data: subTracks }));
                    } else if (msg.type === 'allow_renegotiation') {
                        if (msg.data && negotiationNeeded) {
                            negotiate();
                        }
                    } else if (msg.type === 'track_stats') {
                        updateTrackStats(msg.data);
                    }
                } catch (error) {
                    console.log(error);
                }
            };

            ws.onclose = function () {
                console.log("websocket close");
            };

            return promise;
        };

        // -------------------------------------------
        //  Data channel events
        // -------------------------------------------
        peerConnection.ondatachannel = (e) => {
            if (e.channel.label === "internal") {
                internalChannel = e.channel;
                videoObserver = new InliveVideoObserver(e.channel);

                internalChannel.addEventListener('message', (ev) => {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === 'vad_started' || msg.type === 'vad_ended') {
                        updateVoiceDetected(msg);
                    }
                });
            }
        };

        // -------------------------------------------
        //  Utility functions
        // -------------------------------------------
        const updateVoiceDetected = (vad: any) => {
            const streamid = vad.data.streamID;
            const videoEl = document.getElementById("video-" + streamid) as HTMLVideoElement | null;
            const container = document.getElementById("container-" + streamid) as HTMLDivElement | null;
            if (!videoEl || !container) {
                console.log("video element not found ", streamid);
                return;
            }

            if (vad.type === 'vad_ended') {
                // voice ended
                videoEl.style.border = "none";
                container.style.margin = "0";
            } else {
                // voice detected
                videoEl.style.border = "5px solid green";
                container.style.margin = "-5px";
            }

            let vadEl = document.getElementById("vad-" + streamid);
            if (!vadEl) {
                vadEl = document.createElement("div");
                vadEl.id = "vad-" + streamid;
                container.appendChild(vadEl);
            }

            if (vad.data.audioLevels !== null) {
                const sum = vad.data.audioLevels.reduce((acc: number, value: any) => acc + value.audioLevel, 0);
                vadEl.innerText = Math.floor(sum / vad.data.audioLevels.length).toString();
            } else {
                vadEl.innerText = "0";
            }
        };

        const negotiate = async () => {
            console.log("negotiate");
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            if (ws) ws.send(JSON.stringify({ type: 'offer', data: offer.sdp }));
        };

        const sleep = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

        // -------------------------------------------
        //  Stats handling
        // -------------------------------------------
        let prevBytesReceived = 0;
        const updateTrackStats = (trackStats: any) => {
          if (!trackStats?.sent_track_stats) {
            console.warn("No 'sent_track_stats' in trackStats:", trackStats);
            return;
          }
            const sentStats = trackStats.sent_track_stats;
            sentStats.forEach((stat: any) => {
                const statsEl = document.getElementById("stats-" + stat.id);
                if (!statsEl) {
                    return;
                }

                let trackStatsEl = statsEl.querySelector(".track-stats");
                if (!trackStatsEl) {
                    trackStatsEl = document.createElement("div");
                    trackStatsEl.className = "track-stats";
                    statsEl.appendChild(trackStatsEl);
                }

                // Show only a small subset for demonstration
                const statsText = `
                    <p>Packet Loss Ratio: ${Math.round(stat.fraction_lost * 100) / 100}</p>
                `;
                trackStatsEl.innerHTML = statsText;
            });
            // receivedStats are not used in this snippet
        };

        const monitorBw = async () => {
            while (peerConnection.connectionState === "connected") {
                const totalBw = bwController.low + bwController.mid + bwController.high;
                if (
                    bwController.available === 0 ||
                    bwController.low === 0 ||
                    bwController.mid === 0 ||
                    bwController.high === 0
                ) {
                    await sleep(5000);
                    continue;
                }

                const ratio = bwController.available / totalBw;
                // You could do something with ratio here
                await sleep(5000);
            }
        };

        const monitorStats = async () => {
            while (peerConnection.connectionState === "connected") {
                const stats = await peerConnection.getStats();
                const qualityLimitiationReason = { cpu: false, bandwidth: false };

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        const trackid = (report.trackIdentifier || "").replace('{', '').replace('}', '');
                        const statsEl = document.querySelector(`#stats-${trackid} .video-stats`) as HTMLDivElement | null;
                        if (!statsEl) {
                            return;
                        }

                        if (typeof bwController[report.trackIdentifier] === "undefined") {
                            bwController[report.trackIdentifier] = 0;
                        }

                        if (prevBytesReceived === 0 || report.bytesReceived === 0) {
                            prevBytesReceived = report.bytesReceived;
                            return;
                        }

                        const deltaBytes = report.bytesReceived - prevBytesReceived;
                        prevBytesReceived = report.bytesReceived;

                        const statsText = `
                            <p>FrameRate: ${report.framesPerSecond}</p>
                            <p>Bitrate: ${(deltaBytes * 8) / 1000} kbps</p>
                            <p>Resolution: ${report.frameWidth}x${report.frameHeight}</p>
                            <p>Packet Lost: ${report.packetsLost}</p>
                            <p>Nack Count: ${report.nackCount}</p>
                        `;
                        statsEl.innerHTML = statsText;
                    }

                    const statsEl = document.getElementById("stats-local");
                    if (report.type === 'candidate-pair' && typeof report.availableOutgoingBitrate !== "undefined") {
                        let bwStatsEl = document.getElementById("stats-local-bandwidth");
                        if (!bwStatsEl) {
                            bwStatsEl = document.createElement("div");
                            bwStatsEl.id = "stats-local-bandwidth";
                            if (statsEl) statsEl.appendChild(bwStatsEl);
                        }
                        bwStatsEl.innerHTML = `
                            <p>available bandwidth: ${report.availableOutgoingBitrate / 1000} kbps</p>
                            <p>current bitrate: ${(bwController.low + bwController.mid + bwController.high) / 1000} kbps</p>
                        `;
                        bwController.available = report.availableOutgoingBitrate;
                    }

                    if (report.type === 'outbound-rtp' && report.kind === 'video') {
                        // high or single-rid
                        if (report.rid === 'high' || typeof report.rid === 'undefined') {
                            if (prevHighBytesSent === 0 || report.bytesSent === 0) {
                                prevHighBytesSent = report.bytesSent;
                                return;
                            }
                            if (statsEl) {
                                let highStatsEl = document.getElementById("stats-local-high");
                                if (!highStatsEl) {
                                    highStatsEl = document.createElement("div");
                                    highStatsEl.id = "stats-local-high";
                                    statsEl.appendChild(highStatsEl);
                                }
                                const deltaBytes = report.bytesSent - prevHighBytesSent;
                                prevHighBytesSent = report.bytesSent;
                                const bitrate = deltaBytes * 8;
                                bwController.high = bitrate;
                                const qualityLimitation = `<p>Quality Limitation Reason: ${report.qualityLimitationReason}</p>`;
                                highStatsEl.innerHTML = `
                                    <h3>High</h3>
                                    <p>FrameRate: ${report.framesPerSecond}</p>
                                    <p>Bitrate: ${bitrate / 1000} kbps</p>
                                    <p>Resolution: ${report.frameWidth}x${report.frameHeight}</p>
                                    ${report.qualityLimitationReason ? qualityLimitation : ""}
                                `;
                                if (report.qualityLimitationReason === "cpu") {
                                    qualityLimitiationReason.cpu = true;
                                }
                                if (report.qualityLimitationReason === "bandwidth") {
                                    qualityLimitiationReason.bandwidth = true;
                                }
                            }
                        }

                        // mid-rid
                        if (report.rid === 'mid') {
                            if (prevMidBytesSent === 0 || report.bytesSent === 0) {
                                prevMidBytesSent = report.bytesSent;
                                return;
                            }
                            if (statsEl) {
                                let midStatsEl = document.getElementById("stats-local-mid");
                                if (!midStatsEl) {
                                    midStatsEl = document.createElement("div");
                                    midStatsEl.id = "stats-local-mid";
                                    statsEl.appendChild(midStatsEl);
                                }
                                const deltaBytes = report.bytesSent - prevMidBytesSent;
                                prevMidBytesSent = report.bytesSent;
                                const bitrate = deltaBytes * 8;
                                bwController.mid = bitrate;

                                midStatsEl.innerHTML = `
                                    <h3>Mid</h3>
                                    <p>FrameRate: ${report.framesPerSecond}</p>
                                    <p>Bitrate: ${bitrate / 1000} kbps</p>
                                    <p>Resolution: ${report.frameWidth}x${report.frameHeight}</p>
                                    <p>Quality Limitation Reason: ${report.qualityLimitationReason}</p>
                                `;
                                if (report.qualityLimitationReason === "cpu") {
                                    qualityLimitiationReason.cpu = true;
                                }
                                if (report.qualityLimitationReason === "bandwidth") {
                                    qualityLimitiationReason.bandwidth = true;
                                }
                            }
                        }

                        // low-rid
                        if (report.rid === 'low') {
                            if (prevLowBytesSent === 0 || report.bytesSent === 0) {
                                prevLowBytesSent = report.bytesSent;
                                return;
                            }
                            if (statsEl) {
                                let lowStatsEl = document.getElementById("stats-local-low");
                                if (!lowStatsEl) {
                                    lowStatsEl = document.createElement("div");
                                    lowStatsEl.id = "stats-local-low";
                                    statsEl.appendChild(lowStatsEl);
                                }
                                const deltaBytes = report.bytesSent - prevLowBytesSent;
                                prevLowBytesSent = report.bytesSent;
                                const bitrate = deltaBytes * 8;
                                bwController.low = bitrate;

                                lowStatsEl.innerHTML = `
                                    <h3>Low</h3>
                                    <p>FrameRate: ${report.framesPerSecond}</p>
                                    <p>Bitrate: ${bitrate / 1000} kbps</p>
                                    <p>Resolution: ${report.frameWidth}x${report.frameHeight}</p>
                                    <p>Quality Limitation Reason: ${report.qualityLimitationReason}</p>
                                `;
                                if (report.qualityLimitationReason === "cpu") {
                                    qualityLimitiationReason.cpu = true;
                                }
                                if (report.qualityLimitationReason === "bandwidth") {
                                    qualityLimitiationReason.bandwidth = true;
                                }
                            }
                        }
                    }
                });

                let qualityLimitiation = "none";
                if (qualityLimitiationReason.cpu && qualityLimitiationReason.bandwidth) {
                    qualityLimitiation = "both";
                } else if (qualityLimitiationReason.cpu) {
                    qualityLimitiation = "cpu";
                } else if (qualityLimitiationReason.bandwidth) {
                    qualityLimitiation = "bandwidth";
                }

                if (internalChannel && internalChannel.readyState === "open") {
                    const statsMsg = {
                        available_outgoing_bitrate: bwController.available,
                        quality_limitation_reason: qualityLimitiation
                    };
                    internalChannel.send(JSON.stringify({ type: 'stats', data: statsMsg }));
                }

                await sleep(1000);
            }
        };

        const toggleStats = () => {
            const statsEls = document.querySelectorAll(".stats");
            statsEls.forEach(el => {
                const display = (el as HTMLElement).style.display;
                (el as HTMLElement).style.display = display === "none" ? "flex" : "none";
            });
        };

        const switchQuality = () => {
            const qualityEl = document.getElementById("selectQuality") as HTMLSelectElement | null;
            if (!qualityEl || !ws) return;
            const quality = qualityEl.value;
            ws.send(JSON.stringify({ type: 'switch_quality', data: quality }));
        };

        // -------------------------------------------
        //  Buttons / UI
        // -------------------------------------------
        const toggleMic = (e: any) => {
            peerConnection.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = !mutedMic;
                    mutedMic = !mutedMic;
                    e.target.innerText = !sender.track.enabled ? 'Unmute Mic' : 'Mute Mic';
                }
            });
        };

        const toggleCam = async (e: any) => {
            const trackIds = screenStream ? screenStream.getTracks().map(track => track.id) : [];
            peerConnection.getSenders().forEach(async (sender) => {
                if (sender.track && sender.track.kind === 'video' && !trackIds.includes(sender.track.id)) {
                    if (!mutedCam && sender.track.readyState === 'live') {
                        sender.track.stop();
                        stream.removeTrack(sender.track);
                    } else {
                        const newStream = await navigator.mediaDevices.getUserMedia({
                            audio: false,
                            video: {
                                width: { ideal: 1280 },
                                height: { ideal: 720 },
                                advanced: [
                                    { frameRate: { min: 30 } },
                                    { height: { min: 360 } },
                                    { width: { min: 720 } },
                                    { frameRate: { max: 30 } },
                                    { width: { max: 1280 } },
                                    { height: { max: 720 } },
                                    { aspectRatio: { exact: 1.77778 } }
                                ]
                            }
                        });
                        const videoTrack = newStream.getVideoTracks()[0];
                        await sender.replaceTrack(videoTrack);
                        stream.addTrack(videoTrack);
                    }
                }
            });
            mutedCam = !mutedCam;
            e.target.innerText = mutedCam ? 'Unmute Cam' : 'Mute Cam';
        };

        const setCodecPreferences = (
            pc: RTCPeerConnection,
            strm: MediaStream,
            codec: string | null,
            scalabilityMode: string
        ) => {
            const isFirefox = navigator.userAgent.includes("Firefox");
            const isSimulcast = (document.getElementById("simulcast") as HTMLInputElement)?.checked;
            const isSvc = (document.getElementById("svc") as HTMLInputElement)?.checked;
            const maxBitrateEl = document.getElementById("maxBitrate") as HTMLSelectElement;
            const maxBitrate = maxBitrateEl ? parseInt(maxBitrateEl.value, 10) : 1000000;

            if (codec === 'vp9' && !isFirefox) {
                let videoTcvr: RTCRtpTransceiver | null = null;
                if (!isSimulcast) {
                    videoTcvr = pc.addTransceiver(strm.getVideoTracks()[0], {
                        direction: 'sendonly',
                        streams: [strm],
                        sendEncodings: [
                            {
                                maxBitrate: maxBitrate,
                                scalabilityMode: isSvc ? scalabilityMode : 'L1T1'
                            } as ExtendedEncodingParameters
                        ]
                    });
                } else {
                    videoTcvr = pc.addTransceiver(strm.getVideoTracks()[0], {
                        direction: 'sendonly',
                        streams: [strm],
                        sendEncodings: [
                            {
                                rid: 'high',
                                maxBitrate: maxBitrate,
                                maxFramerate: 30,
                                scalabilityMode: isSvc ? scalabilityMode : 'L1T1'
                            } as ExtendedEncodingParameters,
                            {
                                rid: 'mid',
                                scaleResolutionDownBy: 2.0,
                                maxFramerate: 30,
                                maxBitrate: maxBitrate / 2,
                                scalabilityMode: isSvc ? scalabilityMode : 'L1T1'
                            } as ExtendedEncodingParameters,
                            {
                                rid: 'low',
                                scaleResolutionDownBy: 4.0,
                                maxBitrate: maxBitrate / 4,
                                maxFramerate: 30,
                                scalabilityMode: isSvc ? scalabilityMode : 'L1T1'
                            } as ExtendedEncodingParameters
                        ]
                    });
                }

                if (videoTcvr?.setCodecPreferences && RTCRtpReceiver.getCapabilities) {
                    const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
                    const vp9_codecs = codecs.filter(c => c.mimeType === "video/VP9");
                    const other_codecs = codecs.filter(c => c.mimeType !== "video/VP9");
                    const final_codecs = [...vp9_codecs, ...other_codecs];
                    videoTcvr.setCodecPreferences(final_codecs);
                }
            } else {
                let videoTcvr: RTCRtpTransceiver | null = null;
                if (!isSimulcast) {
                    videoTcvr = pc.addTransceiver(strm.getVideoTracks()[0], {
                        direction: 'sendonly',
                        streams: [strm],
                        sendEncodings: [
                            {
                                maxBitrate: 1200 * 1000
                            }
                        ]
                    });
                } else {
                    videoTcvr = pc.addTransceiver(strm.getVideoTracks()[0], {
                        direction: 'sendonly',
                        streams: [strm],
                        sendEncodings: [
                            {
                                rid: 'high',
                                maxBitrate: 1200 * 1000,
                                maxFramerate: 30
                            },
                            {
                                rid: 'mid',
                                scaleResolutionDownBy: 2.0,
                                maxFramerate: 30,
                                maxBitrate: 500 * 1000
                            },
                            {
                                rid: 'low',
                                scaleResolutionDownBy: 4.0,
                                maxBitrate: 150 * 1000,
                                maxFramerate: 30
                            }
                        ]
                    });
                }

                if (videoTcvr?.setCodecPreferences && RTCRtpReceiver.getCapabilities) {
                    const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
                    const h264Codecs = codecs.filter(c => c.mimeType === "video/H264");
                    const otherCodecs = codecs.filter(c => c.mimeType !== "video/H264");
                    const finalCodecs = [...h264Codecs, ...otherCodecs];
                    videoTcvr.setCodecPreferences(finalCodecs);
                } else {
                    console.log("setCodecPreferences not supported");
                }
            }
        };

        const shareScreen = async () => {
            if (screenStream) {
                // Stop screen sharing
                const trackIds = screenStream.getTracks().map(track => track.id);
                peerConnection.getSenders().forEach(sender => {
                    if (sender.track && trackIds.includes(sender.track.id)) {
                        sender.track.stop();
                        peerConnection.removeTrack(sender);
                    }
                });
                const container = document.getElementById("container-" + screenStream.id);
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                screenStream = null;
                isAllowRenegotiation();
                return;
            }

            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            const videoTrack = screenStream.getVideoTracks()[0];
            const audioTrack = screenStream.getAudioTracks()[0];

            if (audioTrack) {
                peerConnection.addTransceiver(audioTrack, {
                    direction: 'sendonly',
                    streams: [screenStream],
                    sendEncodings: [{ priority: 'high' }]
                });
            }

            setCodecPreferences(peerConnection, screenStream, 'vp9', "L1T3");

            const container = document.createElement("div");
            container.className = "container";
            container.id = "container-" + screenStream.id;

            const video = document.createElement("video");
            video.id = "video-" + videoTrack.id;
            video.autoplay = true;
            video.srcObject = screenStream;
            container.appendChild(video);

            const mainEl = document.querySelector('main');
            if (mainEl) mainEl.appendChild(container);

            videoTrack.addEventListener('ended', () => {
                console.log('Video track ended, stopping screen sharing');
                if (mainEl) {
                    mainEl.removeChild(container);
                }
                peerConnection.getSenders().forEach(sender => {
                    if (sender.track && sender.track.id === videoTrack.id) {
                        sender.track.stop();
                        peerConnection.removeTrack(sender);
                    }
                });
                isAllowRenegotiation();
            });

            isAllowRenegotiation();
        };

        const isAllowRenegotiation = () => {
            if (ws) {
                ws.send(JSON.stringify({ type: 'is_allow_renegotiation' }));
            }
            negotiationNeeded = true;
        };

        // -------------------------------------------
        //  Start calls
        // -------------------------------------------
        const viewOnly = () => {
            start(null, true);
        };

        const startH264 = () => {
            start('h264', false);
        };

        const startVP9 = () => {
            start('vp9', false);
        };

        const start = async (codec: string | null, viewOnly: boolean) => {
            await startWs();
            const btnH264 = document.getElementById("btnStartH264") as HTMLButtonElement | null;
            const btnVP9 = document.getElementById("btnStartVP9") as HTMLButtonElement | null;
            const btnViewOnly = document.getElementById("btnViewOnly") as HTMLButtonElement | null;
            if (btnH264) btnH264.disabled = true;
            if (btnVP9) btnVP9.disabled = true;
            if (btnViewOnly) btnViewOnly.disabled = true;

            if (!viewOnly) {
                const videoConstraints = {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    advanced: [
                        { frameRate: { min: 30 } },
                        { height: { min: 360 } },
                        { width: { min: 720 } },
                        { frameRate: { max: 30 } },
                        { width: { max: 1280 } },
                        { height: { max: 720 } },
                        { aspectRatio: { exact: 1.77778 } }
                    ]
                };
                const constraints = {
                    audio: true,
                    video: videoConstraints
                };

                const initStream = await navigator.mediaDevices.getUserMedia(constraints);
                const streamid = initStream.id.replace('{', '').replace('}', '');
                initStream.getTracks().forEach(track => {
                    stream.addTrack(track);
                });

                // Create container for local stream
                let container = document.getElementById("container-" + streamid);
                if (!container) {
                    container = document.createElement("div");
                    container.className = "container";
                    container.id = "container-" + streamid;
                    const mainEl = document.querySelector('main');
                    if (mainEl) mainEl.appendChild(container);
                }

                // Create local video element
                let localVideo = document.getElementById("video-" + streamid) as HTMLVideoElement | null;
                if (!localVideo) {
                    localVideo = document.createElement("video");
                    localVideo.id = "video-" + streamid;
                    localVideo.autoplay = true;
                    localVideo.muted = true;
                    container.appendChild(localVideo);
                }

                localVideo.srcObject = stream;

                // Add audio transceiver
                peerConnection.addTransceiver(stream.getAudioTracks()[0], {
                    direction: 'sendonly',
                    streams: [stream],
                    sendEncodings: [{ priority: 'high' }]
                });

                // Prefer RED (optional) + OPUS
                // (Check if setCodecPreferences is supported in your environment)
                // We do a minimal re-check here, see your original code for details
                const audioTcvr = peerConnection.getTransceivers().find(t => t.sender.track?.kind === 'audio');
                if (audioTcvr && audioTcvr.setCodecPreferences && RTCRtpReceiver.getCapabilities) {
                    const audioCodecs = RTCRtpReceiver.getCapabilities('audio')?.codecs || [];
                    let audioCodecsPref: RTCRtpCodecCapability[] = [];

                    if (red) {
                        for (let i = 0; i < audioCodecs.length; i++) {
                            if (audioCodecs[i].mimeType === "audio/red") {
                                audioCodecsPref.push(audioCodecs[i]);
                            }
                        }
                    }
                    for (let i = 0; i < audioCodecs.length; i++) {
                        if (audioCodecs[i].mimeType === "audio/opus") {
                            audioCodecsPref.push(audioCodecs[i]);
                        }
                    }
                    audioTcvr.setCodecPreferences(audioCodecsPref);
                }

                // Now set the video codec preferences
                setCodecPreferences(peerConnection, stream, codec, "L3T3_KEY");
            } else {
                // View only => no local tracks, just add transceivers to receive
                peerConnection.addTransceiver('video', { direction: 'sendrecv' });
                peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
            }

            // ontrack event handler
            peerConnection.ontrack = (e) => {
                e.streams.forEach((remoteStream) => {
                    const containerId = "container-" + remoteStream.id;
                    let container = document.getElementById(containerId);
                    if (!container) {
                        container = document.createElement("div");
                        container.className = "container";
                        container.id = containerId;
                        const mainEl = document.querySelector('main');
                        if (mainEl) mainEl.appendChild(container);
                    }

                    let remoteVideo = document.getElementById("video-" + remoteStream.id) as HTMLVideoElement | null;
                    if (!remoteVideo) {
                        remoteVideo = document.createElement("video");
                        remoteVideo.id = "video-" + remoteStream.id;
                        remoteVideo.autoplay = true;
                        container.appendChild(remoteVideo);
                        if (videoObserver) {
                            videoObserver.observe(remoteVideo);
                        }
                    }

                    if (e.track.kind === 'video') {
                        const trackid = e.track.id.replace('{', '').replace('}', '');
                        let statsEl = document.getElementById("stats-" + trackid);
                        if (!statsEl) {
                            const videoStats = document.createElement("div");
                            videoStats.className = "video-stats";

                            statsEl = document.createElement("div");
                            statsEl.className = "stats";
                            statsEl.id = "stats-" + trackid;
                            statsEl.appendChild(videoStats);
                            container.appendChild(statsEl);
                        }
                    }
                    remoteVideo.srcObject = remoteStream;

                    remoteStream.onremovetrack = (ev) => {
                        if (remoteVideo) {
                            remoteVideo.srcObject = null;
                            remoteVideo.remove();
                        }
                        if (container) {
                            container.remove();
                        }
                        if (videoObserver && remoteVideo) {
                            videoObserver.unobserve(remoteVideo);
                        }
                    };
                });
            };

            // Create and send initial offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            if (ws) ws.send(JSON.stringify({ type: 'offer', data: offer.sdp }));

            peerConnection.onicecandidate = (e) => {
                if (e.candidate && ws) {
                    ws.send(JSON.stringify({ type: 'candidate', data: e.candidate.candidate }));
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log("onconnectionstatechange", peerConnection.connectionState);
                if (peerConnection.connectionState === "connected") {
                    monitorStats();
                    monitorBw();
                }
            };
        };

        // Bind buttons
        const btnViewOnly = document.getElementById("btnViewOnly");
        if (btnViewOnly) btnViewOnly.onclick = viewOnly;

        const btnStartH264 = document.getElementById("btnStartH264");
        if (btnStartH264) btnStartH264.onclick = startH264;

        const btnStartVP9 = document.getElementById("btnStartVP9");
        if (btnStartVP9) btnStartVP9.onclick = startVP9;

        const btnToggleMic = document.getElementById("btnToggleMic");
        if (btnToggleMic) btnToggleMic.onclick = toggleMic;

        const btnToggleCam = document.getElementById("btnToggleCam");
        if (btnToggleCam) btnToggleCam.onclick = toggleCam;

        const btnShareScreen = document.getElementById("btnShareScreen");
        if (btnShareScreen) btnShareScreen.onclick = shareScreen;

        const btnStats = document.getElementById("btnStats");
        if (btnStats) btnStats.onclick = toggleStats;

        const selectQuality = document.getElementById("selectQuality");
        if (selectQuality) selectQuality.onchange = switchQuality;

        // This runs only once after the component mounts
    }, [roomID]);

    // We’ll place the same CSS here in a <style> tag for convenience.
    // You could move it to a dedicated .css or .scss file in a real project.
    return (
      <div className="room-page-wrapper">
        <style>{`
          /* 
           * Вместо селектора body используем .room-page-wrapper,
           * чтобы не ломать глобальные стили Tailwind.
           */
          .room-page-wrapper {
            display: grid;
            /* 3 строки: header (auto), основная часть (1fr), footer (auto) */
            grid-template-rows: auto 1fr auto;
            /* 2 колонки: основная (auto) + боковая панель (auto), 
               но проще объединить aside+main в одну строку, а можно и по-другому */
            grid-template-columns: 8fr 2fr;
            width: 100vw;
            height: 100vh; /* Высота экрана */
          }
  
          header {
            grid-row: 1;        /* 1-я строка */
            grid-column: 1 / 3; /* занять обе колонки (8fr + 2fr) */
            text-align: center;
            background-color: #f2f2f2;
            padding: 1rem;
          }
  
          main {
            grid-row: 2;       /* 2-я строка */
            grid-column: 1;    /* первая колонка (8fr) */
            overflow: auto;    /* если контент не влезет, скролл */
            padding: 1rem;
            display: grid;
            place-items: center;
            background-color: #fafafa;
          }
  
          aside {
            grid-row: 2;    /* 2-я строка */
            grid-column: 2; /* вторая колонка (2fr) */
            overflow-y: auto;
            background-color: #f0f0f0;
            font-size: 0.8rem;
            padding: 1rem;
          }
  
          footer {
            grid-row: 3;      /* 3-я строка */
            grid-column: 1/3; /* занять обе колонки */
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            background-color: #f2f2f2;
            padding: 0.5rem;
          }
  
          /* Внутри main .container – если нужно */
          .container {
            position: relative;
            width: 100%;
          }
          .container .stats {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            color: white;
            background-color: rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            z-index: 10;
          }
  
          video {
            background-color: black;
            min-width: 320px;
            width: 100%;
            height: auto;
            min-height: 240px;
            object-fit: contain;
            box-sizing: border-box;
          }
        `}</style>
  
        {/* Верхняя полоса */}
        <header>
          <h1>HTTP WebSocket Example</h1>
          <p>Open the console to see the output.</p>
        </header>
  
        {/* Основная часть */}
        <main id="mainContent">
          {/* Здесь динамически появляются контейнеры <div class="container"> для локального/удалённого видео */}
        </main>
  
        {/* Боковая панель */}
        <aside>
          <h3>Outbound Video</h3>
          <p id="clientid"></p>
          <p>
            Network: <span id="network">Stable</span>
          </p>
          <div id="stats-local"></div>
        </aside>
  
        {/* Нижняя полоса с кнопками */}
        <footer>
          <button id="btnStartH264">Start H264</button>
          <button id="btnStartVP9">Start with VP9</button>
          <button id="btnViewOnly">View only</button>
          <button id="btnToggleMic">Mute Mic</button>
          <button id="btnToggleCam">Mute Cam</button>
          <span>
            <input id="simulcast" type="checkbox" value="simulcast" />
            Simulcast
          </span>
          <span>
            <input id="svc" type="checkbox" value="svc" defaultChecked />
            SVC
          </span>
          <button id="btnShareScreen">Share Screen</button>
          <button id="btnStats">Toggle Stats</button>
          <span>
            <label>Quality</label>
            <select id="selectQuality">
              <option value="high" defaultValue={"high"}>
                high
              </option>
              <option value="highmid">high-mid</option>
              <option value="highlow">high-low</option>
              <option value="mid">mid</option>
              <option value="midmid">mid-mid</option>
              <option value="midlow">mid-low</option>
              <option value="low">low</option>
              <option value="lowmid">low-mid</option>
              <option value="lowlow">low-low</option>
              <option value="none">none</option>
            </select>
          </span>
          <span>
            <label>MaxBitrate</label>
            <select id="maxBitrate">
              <option value="120000">120Kbps</option>
              <option value="300000">300Kbps</option>
              <option value="500000">500Kbps</option>
              <option value="1000000" defaultValue={"1000000"}>
                1Mbps
              </option>
              <option value="2000000">2Mbps</option>
            </select>
          </span>
        </footer>
      </div>
    );
}