import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRCodeImage({ value, size = 200 }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#141a2e", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) return <div className="qr-placeholder" style={{ width: size, height: size }} />;
  return <img src={dataUrl} alt="QR להצטרפות" width={size} height={size} className="qr-image" />;
}
