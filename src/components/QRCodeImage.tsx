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
      color: { dark: "#16181d", light: "#ffffff" },
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
      className="rounded-2xl bg-white p-3 shadow-sm border border-brand-border"
    />
  );
}
