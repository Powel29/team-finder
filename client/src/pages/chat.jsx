import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState, PageSpinner } from '@/components/ui';
import { ChatSidebar } from '@/features/chat/chat-sidebar.jsx';
import { useChatTeams } from '@/features/chat/hooks.js';
import { ChatWindow } from '@/features/chat/chat-window.jsx';
import { useTeam } from '@/features/teams/api.js';
import { useMediaQuery } from '@/hooks/use-media-query.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

/** /chat: the chat list on phones, a redirect to the first team's chat on desktop. */
export function ChatIndexPage() {
  usePageTitle('Chat');
  const desktop = useMediaQuery('(min-width: 1024px)');
  const { teams, isPending } = useChatTeams();
  if (desktop && !isPending && teams.length > 0) return <Navigate to={`/teams/${teams[0].id}/chat`} replace />;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-3xl font-extrabold">Chat</h1>
      <ChatSidebar />
    </div>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const { data: team, isPending, error, refetch } = useTeam(id);
  const qc = useQueryClient();
  usePageTitle(team ? `${team.name} chat` : 'Chat');

  // Opening a chat clears its unread badge.
  useEffect(() => {
    qc.setQueryData(['chatUnread'], (prev) => ({ ...prev, [id]: 0 }));
  }, [id, qc]);

  if (isPending) return <PageSpinner />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        title={error.status === 403 ? 'Members only' : 'Could not open chat'}
      />
    );
  if (team.myRelation === 'NONE')
    return (
      <ErrorState error={{ message: 'Only team members can read and write in the team chat.' }} title="Members only" />
    );

  return (
    <div className="grid h-[calc(100dvh-10rem)] min-h-[28rem] gap-4 lg:grid-cols-[18rem_1fr] md:h-[calc(100dvh-9rem)]">
      <aside className="hidden overflow-y-auto lg:block">
        <ChatSidebar activeId={team.id} />
      </aside>
      <div className="flex min-h-0 flex-col">
        <h1 className="sr-only">{team.name} chat</h1>
        <div className="min-h-0 flex-1">
          <ChatWindow key={team.id} team={team} />
        </div>
      </div>
    </div>
  );
}
