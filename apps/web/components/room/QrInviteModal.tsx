'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';

export function QrInviteModal({
  code,
  open,
  onClose,
}: {
  code: string;
  open: boolean;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const url = `${window.location.origin}/room/join?code=${code}`;
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#132B4F', light: '#FFFFFF' },
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [open, code]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Room QR Code Invite"
    >
      <div className="chaos-card p-6 max-w-xs w-full text-center space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR modal"
          className="absolute top-3 right-3 p-2 rounded-btn hover:bg-chaos-bg dark:hover:bg-chaos-dark-elevated"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="font-extrabold text-lg">Scan to Join Room</h3>
          <p className="text-xs text-chaos-text-secondary mt-0.5">
            Room Code: <span className="font-mono font-bold">{code}</span>
          </p>
        </div>

        {dataUrl && (
          <img
            src={dataUrl}
            alt={`QR code to join CHAOS room ${code}`}
            className="mx-auto rounded-card border border-chaos-border p-2 bg-white"
          />
        )}

        <p className="text-xs text-chaos-text-muted">
          Point your phone camera at this QR code to jump straight into the lobby.
        </p>
      </div>
    </div>
  );
}
