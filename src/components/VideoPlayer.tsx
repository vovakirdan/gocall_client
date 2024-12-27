import React from "react";

interface VideoPlayerProps {
  stream: MediaStream;
  muted?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, muted = false }) => {
  return (
    <video
      autoPlay
      playsInline
      muted={muted}
      ref={(video) => {
        if (video) video.srcObject = stream;
      }}
    ></video>
  );
};

export default VideoPlayer;
