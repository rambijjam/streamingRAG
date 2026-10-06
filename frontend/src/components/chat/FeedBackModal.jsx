import { useState } from 'react';
import Modal from '../common/Modal';

export default function FeedbackModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      title="What went wrong?"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Skip</button>
          <button className="btn btn-primary" onClick={() => onSubmit(reason)}>Send to admin</button>
        </>
      }
    >
      <p style={{ fontSize: 13 }}>
        This helps admins see exactly what's missing from the knowledge base. Your note goes to the
        Feedback Log along with your question.
      </p>
      <div className="field">
        <textarea
          className="input"
          rows={3}
          placeholder="e.g. The answer didn't mention adoption leave at all"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      </div>
    </Modal>
  );
}
