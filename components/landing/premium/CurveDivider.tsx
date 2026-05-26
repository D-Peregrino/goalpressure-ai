export default function CurveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className="gpl__curve-divider" aria-hidden>
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        style={flip ? { transform: "scaleY(-1)" } : undefined}
      >
        <path
          d="M0,32 C360,64 720,0 1080,32 C1260,48 1380,40 1440,32 L1440,64 L0,64 Z"
          fill={flip ? "#06080d" : "rgba(255,255,255,0.02)"}
        />
      </svg>
    </div>
  );
}
