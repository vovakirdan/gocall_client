export class InliveVideoObserver {
    #lastReportTime: Record<string, number>;
    #intervalGap: number;
    #dataChannel: RTCDataChannel;
    #videoElements: HTMLVideoElement[];
    #resizeObserver: ResizeObserver;
    #intersectionObserver: IntersectionObserver;

    /**
     * Constructor.
     * @param dataChannel - Data channel to use for reporting video size
     * @param intervalGap - Interval time gap between reports in milliseconds
     */
    constructor(dataChannel: RTCDataChannel, intervalGap?: number) {
        this.#intervalGap = typeof intervalGap === 'number' ? intervalGap : 1000;
        this.#lastReportTime = {};

        this.#dataChannel = dataChannel;
        this.#videoElements = [];

        this.#resizeObserver = new ResizeObserver(this.#onResize.bind(this));
        this.#intersectionObserver = new IntersectionObserver(this.#onIntersection.bind(this));
    }

    /**
     * Callback when video element is resized.
     * @param entries - Resize observer entries
     */
    #onResize(entries: ResizeObserverEntry[]): void {
        entries.forEach(entry => {
            if (entry.contentBoxSize) {
                const target = entry.target as HTMLVideoElement;
                const srcObject = target.srcObject;
                if (srcObject && srcObject instanceof MediaStream) {
                    const videoTracks = srcObject.getVideoTracks();
                    if (videoTracks.length > 0) {
                        const trackId = videoTracks[0].id;
                        const contentBoxSize = Array.isArray(entry.contentBoxSize)
                            ? entry.contentBoxSize[0]
                            : entry.contentBoxSize;
                        const width = contentBoxSize.inlineSize;
                        const height = contentBoxSize.blockSize;
                        this.#onVideoSizeChanged(trackId, width, height);
                    }
                }
            }
        });
    }

    /**
     * Callback when video element's intersection changes.
     * @param entries - Intersection observer entries
     */
    #onIntersection(entries: IntersectionObserverEntry[]): void {
        entries.forEach(entry => {
            const target = entry.target as HTMLVideoElement;
            const srcObject = target.srcObject;
            if (srcObject && srcObject instanceof MediaStream) {
                const videoTracks = srcObject.getVideoTracks();
                if (videoTracks.length > 0) {
                    const trackId = videoTracks[0].id;
                    const width = entry.isIntersecting ? target.videoWidth : 0;
                    const height = entry.isIntersecting ? target.videoHeight : 0;
                    this.#onVideoSizeChanged(trackId, width, height);
                }
            }
        });
    }

    /**
     * Observe video element for any visibility or resize changes.
     * @param videoElement - Video element to watch
     */
    observe(videoElement: HTMLVideoElement): void {
        this.#watchVideoElement(videoElement);
        this.#videoElements.push(videoElement);
    }

    /**
     * Unobserve video element for any visibility or resize changes.
     * @param videoElement - Video element to stop watching
     */
    unobserve(videoElement: HTMLVideoElement): void {
        this.#intersectionObserver.unobserve(videoElement);
        this.#resizeObserver.unobserve(videoElement);
        this.#videoElements = this.#videoElements.filter(ve => ve !== videoElement);
    }

    /**
     * Watch video element events.
     * @param videoElement - Video element to watch
     */
    #watchVideoElement(videoElement: HTMLVideoElement): void {
        this.#intersectionObserver.observe(videoElement);
        this.#resizeObserver.observe(videoElement);
    }

    /**
     * Report video size to peer connection.
     * @param id - MediaStreamTrack ID
     * @param width - Video width
     * @param height - Video height
     */
    #onVideoSizeChanged(id: string, width: number, height: number): void {
        const lastTime = this.#lastReportTime[id];
        const currentTime = Date.now();

        if (lastTime && (currentTime - lastTime) < this.#intervalGap) {
            return;
        }

        this.#lastReportTime[id] = currentTime;

        const sendData = () => {
            const data = JSON.stringify({
                type: 'video_size',
                data: {
                    track_id: id,
                    width: Math.floor(width),
                    height: Math.floor(height)
                }
            });

            console.log("Sending video size data:", data);
            this.#dataChannel.send(data);
        };

        if (this.#dataChannel.readyState === "open") {
            sendData();
        } else {
            const onOpen = () => {
                sendData();
                this.#dataChannel.removeEventListener('open', onOpen);
            };
            this.#dataChannel.addEventListener('open', onOpen);
        }
    }
}