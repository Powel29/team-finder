import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/** Button-triggered popover. `children` is a render function receiving `close`. */
export function Dropdown({ trigger, children, align = 'right', label, panelClassName, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  const toggle = (next) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !root.current?.contains(e.target) && toggle(false);
    const onKey = (e) => e.key === 'Escape' && toggle(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => toggle(!open)}
        className="rounded-xl focus-visible:outline-2"
      >
        {trigger}
      </button>
      {open && (
        <div
          className={clsx(
            'absolute z-40 mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName ?? 'w-56 p-1.5',
          )}
        >
          {children(() => toggle(false))}
        </div>
      )}
    </div>
  );
}

export const MenuItem = ({ icon: Icon, children, className, ...props }) => (
  <button
    type="button"
    role="menuitem"
    className={clsx(
      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100',
      className,
    )}
    {...props}
  >
    {Icon && <Icon className="size-4" aria-hidden />}
    {children}
  </button>
);
