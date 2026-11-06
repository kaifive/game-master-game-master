import qrcode from "qrcode-generator";

/** A QR code as an SVG: dark modules on white with a quiet zone, so any phone camera reads it (S05-AC3). */
export function QrCode({ value, label }: { value: string; label: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.isDark(y, x)) d += `M${String(x + 4)} ${String(y + 4)}h1v1h-1z`;
  const size = n + 8;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      className="block h-auto w-full rounded-gm"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={d} fill="#000000" shapeRendering="crispEdges" />
    </svg>
  );
}
