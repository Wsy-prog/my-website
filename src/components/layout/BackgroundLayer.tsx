import { AuroraBackground } from "./AuroraBackground";

interface BackgroundLayerProps {
  type?: "image" | "video" | "aurora" | "none";
  src?: string;
  blur?: number;
  overlayOpacity?: number;
  overlayColor?: string;
  darkOverlayColor?: string;
}

export function BackgroundLayer({
  type = "aurora",
  src,
  blur = 4,
  overlayOpacity = 0.4,
  overlayColor = "rgba(243, 244, 246, 0.6)",
  darkOverlayColor = "rgba(18, 18, 18, 0.7)",
}: BackgroundLayerProps) {
  if (type === "none") return null;

  return (
    <>
      {/* Aurora background — always present beneath custom backgrounds */}
      <AuroraBackground />

      {/* Custom image background */}
      {type === "image" && src && (
        <div className="bg-layer">
          <div
            className="bg-layer-image"
            style={{
              backgroundImage: `url(${src})`,
              filter: `blur(${blur}px)`,
            }}
          />
          <div
            className="bg-layer-overlay light-overlay"
            style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
          />
          <div
            className="bg-layer-overlay dark-overlay hidden dark:block"
            style={{ backgroundColor: darkOverlayColor, opacity: overlayOpacity + 0.1 }}
          />
        </div>
      )}

      {/* Custom video background */}
      {type === "video" && src && (
        <div className="bg-layer">
          <video
            className="bg-layer-video"
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{ filter: `blur(${blur}px)` }}
          />
          <div
            className="bg-layer-overlay light-overlay"
            style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
          />
          <div
            className="bg-layer-overlay dark-overlay hidden dark:block"
            style={{ backgroundColor: darkOverlayColor, opacity: overlayOpacity + 0.1 }}
          />
        </div>
      )}
    </>
  );
}
