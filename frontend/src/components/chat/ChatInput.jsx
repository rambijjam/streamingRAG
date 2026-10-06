import { useRef } from 'react';

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const taRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  };

  return (
    <div className="chat-input-bar">
      <div className="chat-input-inner">
        <textarea
          ref={taRef}
          className="input"
          placeholder="Ask about a policy, a document, anything in your knowledge base..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="btn btn-primary" disabled={!value.trim() || disabled} onClick={onSend}>
          {disabled ? <span className="spinner" /> : 'Send'}
        </button>
      </div>
      <div className="hint">Enter to send · Shift + Enter for a new line</div>
    </div>
  );
}
