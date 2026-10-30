import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from './use-dialog.js';
import { IconButton } from './button.jsx';

/** Slide-in panel from the left, used for filters on small screens. */
export function Drawer({ open, onClose, title, children }) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="h-full w-[min(22rem,90vw)] overflow-y-auto bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <IconButton label="Close panel" icon={X} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
