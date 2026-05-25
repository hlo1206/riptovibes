'use client';

export default function Modal({ title, children, onClose, actions }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>{title}</h3>
          <button className="btn btn-small btn-ghost" onClick={onClose}>Close</button>
        </div>
        {children}
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
