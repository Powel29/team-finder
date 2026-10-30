import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { timeOfDay } from '@/lib/format.js';

export function ChatMessage({ message, mine, showSender }) {
  return (
    <li className={clsx('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && (showSender ? <Avatar name={message.sender.name} size="sm" /> : <span className="size-8 shrink-0" />)}
      <div className={clsx('max-w-[80%] sm:max-w-[70%]', mine && 'text-right')}>
        {showSender && !mine && (
          <p className="mb-0.5 px-1 text-xs font-semibold text-slate-600">{message.sender.name}</p>
        )}
        <p
          className={clsx(
            'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm',
            mine
              ? 'rounded-br-md bg-ink text-white'
              : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200',
            message.status === 'sending' && 'opacity-60',
            message.status === 'failed' && 'bg-red-100 text-red-900 ring-1 ring-red-300',
          )}
        >
          {message.body}
        </p>
        <p className="mt-0.5 px-1 text-[11px] text-slate-600">
          {message.status === 'failed' ? (
            <span className="inline-flex items-center gap-1 font-semibold text-danger">
              <AlertCircle className="size-3" aria-hidden /> Not sent
            </span>
          ) : message.status === 'sending' ? (
            'Sending…'
          ) : (
            timeOfDay(message.createdAt)
          )}
        </p>
      </div>
    </li>
  );
}
