import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../services/authApi';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import CitationModal from './CitationModal';
import ChatInput from './ChatInput';
import EmptyState from '../common/EmptyState';
import { TextSearchIcon } from 'lucide-react';

export default function ChatWindow() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    authApi.getChatHistory(50)
      .then((rows) => {
        if (cancelled) return;
        const rebuilt = rows.flatMap((row) => ([
          { role: 'user', text: row.question, ts: new Date(row.created_at).getTime() },
          { role: 'ai', chatId: row.id, answer: row.answer, feedBackScore : row.feedback_score, citations: [], forQuery: row.question, ts: new Date(row.created_at).getTime() },
        ]));
        setMessages(rebuilt);
      })
      .catch(() => { /* fresh account or backend unreachable — start with an empty thread */ })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; }; // run before the next effect or unmount, to avoid setting state on an unmounted component
  }, [user.email]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const query = draft.trim();
    if (!query || sending) return;
    const userMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    setSending(true);
    try {
      const result = await authApi.askQuestion(query);
      const aiMsg = { role: 'ai', chatId: result.chat_id, answer: result.answer, citations: [], forQuery: query, ts: Date.now() };
      setMessages((m) => [...m, aiMsg]);
    } catch (e) {
      const errMsg = {
        role: 'ai',
        isGap: true,
        answer: e.response?.data?.detail || "I couldn't reach the knowledge base API. Is backend running?",
        citations: [],
        forQuery: query,
        ts: Date.now(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="access-note">
        <span className="dot" /> Answers are filtered to documents your role ({user.role}) can access
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {loadingHistory ? (
          <div className="spinner" />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<TextSearchIcon size={18} />}
            title="Ask your first question"
            body="Try “What’s our current remote work policy？” or “What’s the API Gateway uptime this month？”"
          />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <MessageBubble message={m} onOpenCitation={setActiveCitation} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {sending && <TypingIndicator />}
      </div>

      <ChatInput value={draft} onChange={setDraft} onSend={handleSend} disabled={sending} />

      {activeCitation && (
        <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
