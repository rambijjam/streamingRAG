import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as authApi from '../../services/authApi';
import { ROLES } from '../../services/roles';
import { useToast } from '../../context/ToastContext';
import { Check, FileIcon, FileUp } from 'lucide-react';

export default function QuickUploadForm() {
  const [file, setFile] = useState(null);
  const [roles, setRoles] = useState(['employee']);
  const [topic, setTopic] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState('idle'); // idle | sending | queued | error
  const [resultMsg, setResultMsg] = useState('');
  const inputRef = useRef(null);
  const { push } = useToast();

  const toggleRole = (r) => setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || roles.length === 0) return;
    setState('sending');
    try {
      const res = await authApi.uploadDocument({ file, roles, topic: topic || 'general' });
      setState('queued');
      setResultMsg(`${res.message} — doc_id ${res.doc_id}`);
      push({ variant: 'success', title: 'Queued for ingestion', body: `${file.name} was pushed onto document-ingestion.` });
      setFile(null);
      setTopic('');
    } catch (err) {
      setState('error');
      push({ variant: 'danger', title: 'Upload failed', body: err.response?.data?.detail || 'POST /admin/upload failed — is the backend running?' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dz-icon"><FileIcon /></div>
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
        <input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label" htmlFor="topic">Document topic</label>
        <input id="topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. hr-policy, finance, engineering" />
      </div>

      <div className="field">
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
              <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} style={{ marginRight: 6 }} />
              {r}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={!file || roles.length === 0 || state === 'sending'}>
        {state === 'sending' ? <span className="spinner" /> : <><FileUp size={20} /> Upload & queue for ingestion</>}
      </button>

      {state === 'queued' && (
        <motion.div
          className="ingestion-card"
          style={{ marginTop: 14, marginBottom: 0 }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="stage-pill done" style={{ marginBottom: 6 }}><> <Check size={20} /> Pushed to Kafka</></div>
          <div className="text-xs secondary-text">{resultMsg}</div>
        </motion.div>
      )}
    </form>
  );
}
