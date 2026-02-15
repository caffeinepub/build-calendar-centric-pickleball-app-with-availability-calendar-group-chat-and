import { MessageSquare } from 'lucide-react';
import ChatPanel from '../components/chat/ChatPanel';
import { Page, PageHeader } from '../components/layout/PageLayout';

export default function ChatPage() {
  return (
    <Page>
      <PageHeader
        icon={<MessageSquare className="h-8 w-8 text-primary" />}
        title="Group Chat"
      />
      <div className="flex-1 min-h-0" style={{ height: 'calc(100dvh - 250px)', minHeight: '400px', maxHeight: '1067px' }}>
        <ChatPanel />
      </div>
    </Page>
  );
}
