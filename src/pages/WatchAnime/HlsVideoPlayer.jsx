import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function HlsVideoPlayer({ url, type }) {
  const videoRef = useRef(null);

  const isEmbed =
    type === "embed" ||
    url?.includes("/embed/") ||
    url?.includes("/e/") ||
    url?.includes("ok.ru/videoembed") ||
    url?.includes("kwik.cx/e/");

  useEffect(() => {
    // If it's an embed iframe, we don't have a video element to mount
    if (isEmbed) return;

    const video = videoRef.current;
    if (!video || !url) return;

    const isHls = url.includes(".m3u8") || url.includes("master.m3u8") || url.includes(".urlset");

    let hls = null;

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 30, // Optimize loading speeds
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => console.log("Auto-play prevented:", err));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Fatal network error encountered, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Fatal media error encountered, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal error, destroying HLS instance.");
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native support (Safari/iOS)
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => console.log("Auto-play prevented:", err));
        });
      } else {
        console.error("HLS playback is not supported in this browser.");
      }
    } else {
      // Standard MP4 video stream
      video.src = url;
      video.load();
      video.play().catch((err) => console.log("Auto-play prevented:", err));
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.src = "";
    };
  }, [url, isEmbed]);

  const toggleFullScreen = () => {
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "f" || event.key === "F") {
        toggleFullScreen();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  if (isEmbed) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "12px", background: "#000" }}>
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "12px" }}>
      <video
        ref={videoRef}
        controls
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "#000",
          borderRadius: "12px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)"
        }}
      />
    </div>
  );
}
