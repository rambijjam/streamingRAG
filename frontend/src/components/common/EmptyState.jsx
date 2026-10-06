export default function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.6 }}>{icon}</div>
      <h3>{title}</h3>
      {body && <p style={{ maxWidth: 380, margin: '0 auto' }}>{body}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
