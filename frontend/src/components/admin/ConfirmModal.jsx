import Modal from '../common/Modal'

export default function ConfirmModal({ title, body, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ fontSize: 13.5 }}>{body}</p>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}