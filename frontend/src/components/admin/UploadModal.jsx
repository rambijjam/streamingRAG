import { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { ROLES } from '../../services/roles';

export default function UploadModal({ onClose, onStart }) {
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [roles, setRoles] = useState(['admin']);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const toggleRole = (r) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  return (
    <Modal
      title="Upload a document"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!file || !topic.trim() || roles.length === 0}
            onClick={() => onStart({ file, roles, topic: topic.trim() })}
          >
            Start ingestion
          </button>
        </>
      }
    >
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dz-icon">▤</div>
        {file ? (
          <>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{file.name}</div>
            <div className="text-xs muted">{(file.size / 1024).toFixed(0)} KB — click to replace</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Drop a PDF here, or click to browse</div>
            <div className="text-xs muted">PDF files only</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label className="field-label" htmlFor="upload_modal_topic">Document topic</label>
        <input
          id="upload_modal_topic"
          className="input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. hr-policy, finance, engineering"
        />
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label className="field-label">Who can access this document?</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {ROLES.map((r) => (
            <label
              key={r}
              className="role-chip"
              style={{
                cursor: 'pointer',
                borderColor: roles.includes(r) ? 'var(--color-clay)' : 'var(--color-border-strong)',
                color: roles.includes(r) ? 'var(--color-clay)' : 'var(--color-sand)',
                background: roles.includes(r) ? 'rgba(102,178,255,0.12)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={roles.includes(r)}
                onChange={() => toggleRole(r)}
                style={{ marginRight: 6 }}
              />
              {r}
            </label>
          ))}
        </div>
        <div className="hint">You can change access later from Document Access Control.</div>
      </div>
    </Modal>
  );
}
