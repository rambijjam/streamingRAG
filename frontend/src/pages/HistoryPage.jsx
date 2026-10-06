import { useEffect, useState } from 'react';
import * as authApi from '../services/authApi';
import EmptyState from '../components/common/EmptyState';
import ReactMarkdown from 'react-markdown';

const fmt = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function HistoryPage() {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    authApi.getChatHistory(200)
      .then((data) => setRows(data))
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /chat/history — is the backend running?'));
  }, []);

  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Just you</span>
          <h1>Chat history</h1>
          <p style={{ marginBottom: 0 }}>Only visible to you — admins can't read your conversations.</p>
        </div>
      </div>

      {loadError && <div className="gap-reason" style={{ marginBottom: 16 }}>{loadError}</div>}

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <EmptyState icon="↺" title="No history yet" body="Questions you ask will show up here." />
      ) : (
        <div className="flex-col gap-3">
          {rows.slice().reverse().map((row) => (
            <div className="card card-tight" key={row.id}>
              <div className="text-xs muted mono" style={{ marginBottom: 8 }}>{fmt(row.created_at)}</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{row.question}</div>
              <div className="secondary-text text-sm">
                <ReactMarkdown>{row.answer}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
