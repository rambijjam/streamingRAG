import { useEffect, useState } from 'react';
import * as authApi from '../../services/authApi';
import { ROLES } from '../../services/roles';
import { useToast } from '../../context/ToastContext';

export default function DocumentAccessPanel() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { push } = useToast();

  useEffect(() => {
    authApi.getAdminDocuments()
      .then((d) => { setDocs(d); setLoadError(null); })
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /admin/documents — is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (doc, role) => {
    const current = doc.allowed_roles || [];
    const nextRoles = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];

    if (nextRoles.length === 0) {
      push({ variant: 'danger', title: 'At least one role required', body: `${doc.filename} must stay visible to at least one role.` });
      return;
    }

    setDocs((prev) => prev.map((d) => (d.doc_id === doc.doc_id ? { ...d, allowed_roles: nextRoles } : d)));
    try {
      await authApi.updateDocumentPermissions(doc.doc_id, nextRoles);
      push({ title: 'Access updated', body: `${doc.filename} → ${nextRoles.join(', ')}` });
    } catch (e) {
      setDocs((prev) => prev.map((d) => (d.doc_id === doc.doc_id ? { ...d, allowed_roles: current } : d)));
      push({ variant: 'danger', title: 'Could not update access', body: e.response?.data?.detail || 'PUT /admin/documents/{doc_id}/permissions failed' });
    }
  };

  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Access control</span>
          <h1>Document access</h1>
          <p style={{ marginBottom: 0 }}>Decide which roles can see each document. Changes apply instantly — no redeploy needed.</p>
        </div>
      </div>

      {loadError && <div className="gap-reason" style={{ marginBottom: 16 }}>{loadError}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                {ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.doc_id}>
                  <td>
                    <div className="doc-row-name">
                      <div className="doc-icon">▤</div>
                      <div style={{ fontWeight: 600 }}>{d.filename}</div>
                    </div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(d.allowed_roles || []).includes(r)}
                        onChange={() => toggle(d, r)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-walnut)', cursor: 'pointer' }}
                        aria-label={`Grant ${r} access to ${d.filename}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
