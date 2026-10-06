import { useEffect, useState } from 'react';
import * as authApi from '../../services/authApi';
import { ROLES } from '../../services/roles';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { initialsFromEmail, displayNameFromEmail } from '../../utils/userDisplay';
import UserAccessModal from './UserAccessModal';

function normalizeUser(raw) {
  return {
    id: raw.id ?? raw.user_id,
    fullName: raw.full_name || raw.name || displayNameFromEmail(raw.email),
    email: raw.email,
    role: raw.role_name || raw.role,
    isActive: raw.is_active ?? raw.active ?? true,
  };
}

export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [auditUser, setAuditUser] = useState(null);
  const { user: me } = useAuth();
  const { push } = useToast();

  const load = () => {
    setLoading(true);
    authApi.listUsers()
      .then((data) => { setUsers((data || []).map(normalizeUser)); setLoadError(null); })
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /admin/users — is the backend running?'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (u, role) => {
    if (u.email === me.email) {
      push({ variant: 'danger', title: "Can't change your own role", body: 'Ask another admin to update your access.' });
      return;
    }
    const prev = u.role;
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
    try {
      await authApi.updateUserRole(u.id, role);
      push({ title: 'Role updated', body: `${u.fullName} is now ${role}` });
    } catch (e) {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: prev } : x)));
      push({ variant: 'danger', title: 'Could not update role', body: e.response?.data?.detail || 'Request failed' });
    }
  };

  const toggleStatus = async (u) => {
    if (u.email === me.email) {
      push({ variant: 'danger', title: "Can't deactivate yourself", body: 'Ask another admin to do this.' });
      return;
    }
    const nextActive = !u.isActive;
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: nextActive } : x)));
    try {
      await authApi.setUserStatus(u.email, nextActive);
      push({
        variant: nextActive ? 'success' : 'danger',
        title: nextActive ? 'User reactivated' : 'User deactivated',
        body: `${u.fullName}'s login token is invalidated immediately.`,
      });
    } catch (e) {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !nextActive } : x)));
      push({
        variant: 'danger',
        title: 'Could not update status',
        body: e.response?.data?.detail || 'PUT /admin/users/status failed',
      });
    }
  };

  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Who belongs where</span>
          <h1>User management</h1>
          <p style={{ marginBottom: 0 }}>Assign roles for new hires and revoke access the moment someone leaves.</p>
        </div>
      </div>

      {loadError && (
        <div className="gap-reason" style={{ marginBottom: 16 }}>{loadError}</div>
      )}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{initialsFromEmail(u.email)}</div>
                      <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td className="mono text-sm muted">{u.email}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      disabled={u.email === me.email}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                      <span className="badge-dot" /> {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setAuditUser(u)}>Audit access</button>
                      <button
                        className={u.isActive ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
                        onClick={() => toggleStatus(u)}
                        disabled={u.email === me.email}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && !loadError && (
                <tr><td colSpan={5} className="text-sm muted" style={{ textAlign: 'center', padding: 24 }}>No users yet — create one from the Dashboard.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {auditUser && <UserAccessModal user={auditUser} onClose={() => setAuditUser(null)} />}
    </div>
  );
}
