import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

export default function ToastHost() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.variant}`}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div>
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
            <button className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
