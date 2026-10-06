import Modal from '../common/Modal';

export default function CitationModal({ citation, onClose }) {
  if (!citation) return null;
  return (
    <Modal title={citation.doc} onClose={onClose}>
      <div className="badge badge-info" style={{ marginBottom: 12 }}>
        <span className="badge-dot" /> Source passage
      </div>
      <p style={{ color: 'var(--color-text-primary)', fontSize: 13.5, lineHeight: 1.6 }}>
        "{citation.snippet}"
      </p>
      <div className="hint">This is the exact passage the assistant retrieved to generate its answer.</div>
    </Modal>
  );
}
