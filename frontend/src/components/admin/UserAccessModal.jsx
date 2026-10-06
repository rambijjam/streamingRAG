import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import * as authApi from '../../services/authApi';

// There's no per-user document-access endpoint on this backend — access is
// role-based, so this pulls the real document list from GET /admin/documents
// and filters by the user's role client-side, mirroring exactly what the
// backend's /ask endpoint already does server-side via
// ask_knowledge_base(..., user_role=...).
export default function UserAccessModal({ user, onClose }) {
  const [documents, setDocuments] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    authApi.getAdminDocuments()
      .then((docs) => setDocuments(docs.filter((d) => (d.allowed_roles || []).includes(user.role))))
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /admin/documents'));
  }, [user.role]);

  return (
    <Modal title="Access audit" onClose={onClose}>
      {loadError ? (
        <p className="text-sm gap-reason">{loadError}</p>
      ) : !documents ? (
        <div className="spinner" />
      ) : (
        <>
          <p style={{ fontSize: 13.5 }}>
            <b style={{ color: 'var(--color-text-primary)' }}>{user.fullName}</b> has the{' '}
            <span className="role-chip" style={{ padding: '2px 8px' }}>{user.role}</span> role and can access{' '}
            <b style={{ color: 'var(--color-text-primary)' }}>{documents.length}</b> document{documents.length !== 1 ? 's' : ''}.
          </p>
          <div className="divider" />
          {documents.length === 0 ? (
            <p className="text-sm">No documents are currently assigned to this role.</p>
          ) : (
            documents.map((d) => (
              <div className="access-summary-item" key={d.doc_id}>
                <span style={{ fontSize: 13 }}>{d.filename}</span>
                <span className="mono text-xs muted">{d.document_topic}</span>
              </div>
            ))
          )}
        </>
      )}
    </Modal>
  );
}
