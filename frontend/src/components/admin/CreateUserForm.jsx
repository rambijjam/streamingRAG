import { useState } from 'react';
import * as authApi from '../../services/authApi';
import { ROLES } from '../../services/roles';
import { useToast } from '../../context/ToastContext';
import { UserPlus } from 'lucide-react';

const empty = { full_name: '', email: '', password: '', role_name: 'employee' };

export default function CreateUserForm() {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.registerUser(form);
      push({ variant: 'success', title: 'Account created', body: `${form.full_name} can now sign in as ${form.role_name}.` });
      setForm(empty);
    } catch (err) {
      push({ variant: 'danger', title: 'Could not create account', body: err.response?.data?.detail || 'POST /auth/register failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="full_name">Full name</label>
        <input id="full_name" className="input" value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new_email">Work email</label>
        <input id="new_email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="jane@company.com" required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new_password">Temporary password</label>
        <input id="new_password" type="text" className="input" value={form.password} onChange={set('password')} placeholder="Share this with them securely" required minLength={6} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="role_name">Role</label>
        <select id="role_name" className="select" value={form.role_name} onChange={set('role_name')}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? <span className="spinner" /> :  <> <UserPlus size={20}/> Create account</>}
      </button>
    </form>
  );
}
