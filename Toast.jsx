'use client';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="toast" onClick={onClose} role="status">
      <strong>{toast.title || 'Ripto Vibes'}</strong>
      <div className="muted" style={{ marginTop: 4 }}>{toast.message}</div>
    </div>
  );
}
