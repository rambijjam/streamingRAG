import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrossIcon, X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className={`modal ${wide ? 'modal-wide' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="modal-header">
            <h2 style={{ marginBottom: 0 }}>{title}</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close"> <X size={25}/> </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
