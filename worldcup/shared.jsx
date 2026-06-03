/* Shared bits for the design directions: Flag image + simple doodle icons.
   Exported to window so each direction file can use them. */
const { useState } = React;

function Flag({ code, w = 80, h, style = {}, className = "" }) {
  const ht = h || Math.round(w * 0.66);
  return (
    <img
      src={window.WC.F(code, 320)}
      alt={code}
      className={className}
      style={{ width: w, height: ht, objectFit: "cover", display: "block", ...style }}
      crossOrigin="anonymous"
    />
  );
}

/* tiny hand-drawn-ish soccer ball */
function Ball({ size = 28, stroke = "#1f2937" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: "block" }}>
      <circle cx="24" cy="24" r="21" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <path d="M24 12l7 5-3 9h-8l-3-9z" fill={stroke} />
      <path d="M24 12V6M31 17l6-3M28 26l5 6M20 26l-5 6M17 17l-6-3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Star({ size = 24, fill = "#f4b740", stroke = "#1f2937" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function Trophy({ size = 60, fill = "#f4b740", stroke = "#1f2937" }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 60 70" fill="none" style={{ display: "block" }}>
      <path d="M16 8h28v14a14 14 0 0 1-28 0z" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 12H8v6a8 8 0 0 0 8 8M44 12h8v6a8 8 0 0 1-8 8" stroke={stroke} strokeWidth="2.5" fill="none" />
      <path d="M30 36v9M22 52h16M24 45h12l2 7H22z" stroke={stroke} strokeWidth="2.5" fill={fill} strokeLinejoin="round" />
      <rect x="18" y="58" width="24" height="7" rx="2" fill={fill} stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}

/* dashed scissors cut-line label */
function CutTag({ color = "#1f2937" }) {
  return (
    <span style={{ fontSize: 11, color, opacity: 0.7, letterSpacing: 1 }}>✂ cut here</span>
  );
}

Object.assign(window, { Flag, Ball, Star, Trophy, CutTag, QR });

/* QR code (uses qrcodejs loaded via CDN as window.QRCode) */
function QR({ text, size = 96, fg = "#16235a", bg = "#ffffff" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    if (window.QRCode) {
      new window.QRCode(el, { text: text || "http://pi-nas.local", width: size, height: size, colorDark: fg, colorLight: bg, correctLevel: window.QRCode.CorrectLevel.M });
    } else {
      el.textContent = "QR";
    }
  }, [text, size, fg, bg]);
  return <div ref={ref} style={{ width: size, height: size, lineHeight: 0 }}></div>;
}
