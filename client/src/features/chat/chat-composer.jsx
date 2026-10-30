import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui';

const MAX = 2000;

/** Enter sends, Shift+Enter inserts a newline. */
export function ChatComposer({ onSend, onTyping, onStopTyping, disabled = false }) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onStopTyping?.();
    setText('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
    >
      <label htmlFor="chat-message" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-message"
        rows={1}
        value={text}
        maxLength={MAX}
        placeholder="Write a message…"
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      <Button type="submit" icon={Send} disabled={!trimmed || disabled} aria-label="Send message">
        <span className="hidden sm:inline">Send</span>
      </Button>
    </form>
  );
}
