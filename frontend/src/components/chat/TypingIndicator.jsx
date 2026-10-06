export default function TypingIndicator() {
  return (
    <div className="msg-row from-ai">
      <div className="avatar" style={{ background: 'var(--color-umber)', color: 'var(--color-sand)' }}>AI</div>
      <div className="msg-bubble">
        <span className="typing-dots"><span /><span /><span /></span>
      </div>
    </div>
  );
}
