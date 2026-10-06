import { useEffect, useState } from 'react';
import * as authApi from '../../services/authApi';
import RoleChip from '../common/RoleChip';
import EmptyState from '../common/EmptyState';
import UploadModal from './UploadModal';
import { useToast } from '../../context/ToastContext';
import { UploadIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// international standardization for organization
const fmtDate = (iso) => (
  iso
    ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  // [] tells js to "Use the browser/system's default locale."  
);


export default function DocumentsPanel() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // holds the doc, or null
  const { push } = useToast();

  const load = () => {
    setLoading(true);
    authApi.getAdminDocuments()
      .then((d) => { setDocs(d); setLoadError(null); })
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /admin/documents — is the backend running?'))
      .finally(() => setLoading(false));
  };
  
  useEffect(() => { load(); }, []);

  const handleStartUpload = async ({ file, roles, topic }) => {
    setShowUpload(false);
    setUploading(true);
    try {
      const res = await authApi.uploadDocument({ file, roles, topic });
      push({ variant: 'success', title: 'Queued for ingestion', body: `${res.message} — doc_id ${res.doc_id}` });
      load();
    } catch (e) {
      push({ variant: 'danger', title: 'Upload failed', body: e.response?.data?.detail || 'POST /admin/upload failed' });
    } finally {
      setUploading(false);
    }
  };


  const handleDelete = async (doc) => {
    try {
      await authApi.deleteDocument(doc.doc_id);
      push({ variant: 'danger', title: 'Document deleted', body: doc.filename });
      load();
    } catch (e) {
      push({ variant: 'danger', title: 'Delete failed', body: e.response?.data?.detail || 'DELETE /admin/documents/{doc_id} failed' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Command center</span>
          <h1>Documents</h1>
          <p style={{ marginBottom: 0 }}>Upload PDFs and control which roles can see them.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)} disabled={uploading}>
          {uploading ? <span className="spinner" /> : <> <UploadIcon size = {20}/>  Upload PDF</>}
        </button>
      </div>

      <div className="stat-strip">
        <div className="stat-card"><div className="stat-value">{docs.length}</div><div className="stat-label">Total documents</div></div>
        <div className="stat-card"><div className="stat-value">{new Set(docs.map((d) => d.document_topic)).size}</div><div className="stat-label">Topics</div></div>
      </div>

      {loadError && <div className="gap-reason" style={{ marginBottom: 16 }}>{loadError}</div>}

      {loading ? (
        <div className="spinner" />
      ) : docs.length === 0 ? (
        <EmptyState icon="▤" title="No documents yet" body="Upload your first PDF to start building the knowledge base." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th><th>Topic</th><th>Access</th><th>Uploaded</th><th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.doc_id}>
                  <td>
                    <div className="doc-row-name">
                      <div className="doc-icon">▤</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.filename}</div>
                        <div className="text-xs muted mono">{d.doc_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{d.document_topic}</td>
                  <td><div className="doc-roles">{(d.allowed_roles || []).map((r) => <RoleChip key={r} role={r} />)}</div></td>
                  <td className="text-sm muted">{fmtDate(d.uploaded_at)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-danger btn-sm" onClick={() => setPendingDelete(d)}>Delete</button>                    
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onStart={handleStartUpload} />}
      {pendingDelete && (
        <ConfirmModal
          title="Delete document?"
          body={`"${pendingDelete.filename}" will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
