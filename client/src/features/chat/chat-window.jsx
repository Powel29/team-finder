import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, MessageSquare, Users } from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { dayLabel } from '@/lib/format.js';
import { ChatComposer } from './chat-composer.jsx';
import { ChatMessage } from './chat-message.jsx';
import { useTeamChat } from './use-team-chat.js';

const NEAR_BOTTOM_PX = 120;

function typingText(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing…`;
  return `${names.slice(0, 2).join(' and ')} are typing…`;
}

/** Day separators and sender names are decided up front so rendering stays a pure map. */
function toRows(messages) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const day = dayLabel(m.createdAt);
    const showDay = !prev || day !== dayLabel(prev.createdAt);
    return { m, day, showDay, showSender: showDay || prev.sender.id !== m.sender.id };
  });
}

export function ChatWindow({ team }) {
  const { user } = useAuth();
  const chat = useTeamChat(team.id);
  const scroller = useRef(null);
  const prevHeight = useRef(null);
  const [pinned, setPinned] = useState(true);
  const [seenId, setSeenId] = useState(null);
  const { messages } = chat;
  const last = messages.at(-1);
  const firstId = messages[0]?.id;
  const lastId = last?.id;
  const lastIsMine = last?.sender.id === user.id;

  // Messages the reader has not scrolled down to yet; derived so no effect has to set state.
  if (last && (pinned || lastIsMine) && seenId !== lastId) setSeenId(lastId);
  const seenIndex = messages.findIndex((m) => m.id === seenId);
  const newCount = seenIndex === -1 ? 0 : messages.length - 1 - seenIndex;

  const scrollToBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Stay pinned to the newest message unless the reader scrolled up; always follow your own sends.
  useLayoutEffect(() => {
    if (pinned || lastIsMine) scrollToBottom();
  }, [lastId, pinned, lastIsMine]);

  // After "load older" prepends messages, keep the reader's place.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (prevHeight.current !== null && el) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    }
  }, [firstId]);

  const onScroll = () => {
    const el = scroller.current;
    setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX);
  };

  const loadOlder = () => {
    prevHeight.current = scroller.current.scrollHeight;
    chat.loadOlder();
  };

  return (
    <section
      aria-label={`${team.name} chat`}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link
          to="/chat"
          aria-label="Back to chats"
          className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">
            <Link to={`/teams/${team.id}`} className="hover:text-brand-700">
              {team.name}
            </Link>
          </h2>
          <p className="flex items-center gap-1 text-xs text-slate-600" aria-live="polite">
            <Users className="size-3.5" aria-hidden /> {team.memberCount} members · {chat.online} online
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-label="Conversation"
          className="h-full overflow-y-auto px-3 py-4 sm:px-4"
        >
          {chat.isPending && <Skeleton className="h-24" />}
          {chat.error && <ErrorState error={chat.error} onRetry={chat.refetch} />}
          {chat.hasMore && (
            <div className="mb-4 flex justify-center">
              <Button size="sm" variant="secondary" loading={chat.loadingOlder} onClick={loadOlder}>
                Load older messages
              </Button>
            </div>
          )}
          {!chat.isPending && !chat.error && messages.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Say hello and start planning your project."
            />
          )}
          <ul className="space-y-1.5" aria-label="Messages">
            {toRows(messages).map(({ m, day, showDay, showSender }) => (
              <li key={m.id} className="list-none">
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-slate-200 px-3 py-0.5 text-xs font-semibold text-slate-600">
                      {day}
                    </span>
                  </div>
                )}
                <ul>
                  <ChatMessage message={m} mine={m.sender.id === user.id} showSender={showSender} />
                </ul>
              </li>
            ))}
          </ul>
        </div>
        {newCount > 0 && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom();
              setPinned(true);
            }}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg"
          >
            <ArrowDown className="size-4" aria-hidden /> {newCount} new message{newCount === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <div className="h-5 px-4 text-xs italic text-slate-600" aria-live="polite">
        {typingText(chat.typingNames)}
      </div>
      <ChatComposer onSend={chat.send} onTyping={chat.notifyTyping} onStopTyping={chat.stopTyping} />
    </section>
  );
}
