"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeImage({ value, size = 220 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#0b1220", light: "#f5f7fb" },
    })
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-2xl bg-brand-navy-lighter"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={dataUrl}
      alt="QR להצטרפות"
      width={size}
      height={size}
      className="rounded-2xl bg-brand-white p-3 shadow-2xl"
    />
  );
}
