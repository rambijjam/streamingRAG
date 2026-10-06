import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../services/authApi';
import FeedbackModal from './FeedbackModal';
import { initialsFromEmail } from '../../utils/userDisplay';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ message, onOpenCitation }) {
  const { user } = useAuth();
    const [feedback, setFeedback] = useState(
    message.feedBackScore > 0 ? 'up' : message.feedBackScore < 0 ? 'down' : null
  );
  const [showReasonModal, setShowReasonModal] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="msg-row from-user">
        <div className="avatar">{initialsFromEmail(user.email)}</div>
        <div className="msg-bubble">{message.text}</div>
      </div>
    );
  }


  const canRateFeedback = Boolean(message.chatId) && !message.isGap;

  const handleThumbs = async (dir) => {
    if (!canRateFeedback) return;
    if(feedback === dir){
      setFeedback(null);
      await authApi.submitFeedback(message.chatId, 0, null);
      return;
    }
    setFeedback(dir);
    if (dir === 'down') {
      setShowReasonModal(true);
    } else {
      await authApi.submitFeedback(message.chatId, 1, null);
    }
  };

  const submitReason = async (reason) => {
    await authApi.submitFeedback(message.chatId, -1, reason);
    setShowReasonModal(false);
  };

  return (
    <div className="msg-row from-ai">
      <div className="avatar" style={{ background: 'var(--color-umber)', color: 'var(--color-sand)' }}>AI</div>
      <div style={{ maxWidth: 560 }}>
        <div className={`msg-bubble${message.isGap ? ' gap-answer' : ''}`}>
          <ReactMarkdown>{message.answer}</ReactMarkdown>
        </div>

        {message.citations?.length > 0 && (
          <div className="citations-row">
            {message.citations.map((c, i) => (
              <button key={i} className="citation-chip" onClick={() => onOpenCitation(c)}>
                [{c.doc}]
              </button>
            ))}
          </div>
        )}

        <div className="feedback-row">
          <button
            className={`feedback-btn${feedback === 'up' ? ' active-up' : ''}`}
            onClick={() => handleThumbs('up')}
            disabled={!canRateFeedback}
            aria-label="Good answer"
          ><ThumbsUp/></button>
          <button
            className={`feedback-btn${feedback === 'down' ? ' active-down' : ''}`}
            onClick={() => handleThumbs('down')}
            disabled={!canRateFeedback}
            aria-label="Bad answer"
          ><ThumbsDown/></button>
          {feedback === 'down' && !showReasonModal && <span className="feedback-note">Sent to admin</span>}
        </div>
      </div>

      {showReasonModal && (
        <FeedbackModal onClose={() => setShowReasonModal(false)} onSubmit={submitReason} />
      )}
    </div>
  );
}
