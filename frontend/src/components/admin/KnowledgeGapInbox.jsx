import { useEffect, useState } from 'react';
import * as authApi from '../../services/authApi';
import EmptyState from '../common/EmptyState';
import { PackageOpen, ThumbsDown, ThumbsUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const timeAgo = (iso) => {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '—';

  const diff = Date.now() - target;
  if (diff < 0) return 'just now'; // clock skew guard, explicit instead of accidental

  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();
};


export default function KnowledgeGapInbox() {
  const [logs, setLogs] = useState(null);
  const [tab, setTab] = useState('down');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    authApi.getFeedback()
      .then((data) => { setLogs(data); setLoadError(null); })
      .catch((e) => setLoadError(e.response?.data?.detail || 'Could not reach /admin/feedback — is the backend running?'));
  }, []);

  const downLogs = (logs || []).filter((g) => g.feedback_score < 0);
  const upLogs = (logs || []).filter((g) => g.feedback_score > 0);
  const shown = tab === 'down' ? downLogs : upLogs;

  return (
    <div>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Retrieval blind spots</span>
          <h1>Feedback log</h1>
          <p style={{ marginBottom: 0 }}>Every question that got a rating from an employee, pulled from GET /admin/feedback.</p>
        </div>
      </div>

      {loadError && <div className="gap-reason" style={{ marginBottom: 16 }}>{loadError}</div>}

      <div className="tabs">
        <button className={`tab-btn ${tab === 'down' ? 'active' : ''}`} onClick={() => setTab('down')}>
          <> 
            <ThumbsDown/> Negative 
            <span className="tab-count">{downLogs.length}</span>
          </>
        </button>
        <button className={`tab-btn ${tab === 'up' ? 'active' : ''}`} onClick={() => setTab('up')}>
          <> 
            <ThumbsUp/> Positive 
            <span className="tab-count">{upLogs.length}</span>
          </>
        </button>
      </div>

      {!logs ? <div className="spinner" /> : shown.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title={tab === 'down' ? 'No negative feedback' : 'No positive feedback yet'}
          body={tab === 'down' ? 'No employee has flagged an answer as unhelpful.' : ''}
        />
      ) : (
        shown.map((g) => (
          <div key={g.id} className="gap-card">
            <div className="gap-query">{g.question}</div>
            <div className="gap-meta">
              <span>Asked by <b style={{ color: 'var(--color-text-secondary)' }}>{g.email}</b></span>
              <span>{timeAgo(g.created_at)}</span>
            </div>
            <div className="gap-reason" style={{ marginTop: 8 }}>
              <div>Answer by AI : </div>
              <ReactMarkdown>{g.answer}</ReactMarkdown>
            </div>
            {g.feedback_text && <div className="gap-reason">
              <div>Feedback from User: </div>
              {g.feedback_text}
            </div>}
          </div>
        ))
      )}
    </div>
  );
}
