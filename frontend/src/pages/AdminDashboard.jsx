import CreateUserForm from '../components/admin/CreateUserForm';
import QuickUploadForm from '../components/admin/QuickUploadForm';

export default function AdminDashboard() {
  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Command center</span>
          <h1>Admin dashboard</h1>
          <p style={{ marginBottom: 0 }}>Create accounts and push new documents into the knowledge base.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="admin-grid">
        <div className="card">
          <h2>User provisioning</h2>
          <p className="text-sm" style={{ marginBottom: 20 }}>
            Public sign-up is disabled — this is the only way new employees or HR staff get an account.
          </p>
          <CreateUserForm />
        </div>

        <div className="card">
          <h2>Knowledge base upload</h2>
          
          <QuickUploadForm />
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
