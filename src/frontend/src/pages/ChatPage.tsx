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
      <div style={{ height: 'clamp(533px, calc(100vh - 250px), 1067px)' }}>
        <ChatPanel />
      </div>
    </Page>
  );
}
