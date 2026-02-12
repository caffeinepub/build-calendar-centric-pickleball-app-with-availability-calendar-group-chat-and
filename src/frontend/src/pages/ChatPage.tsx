import ChatPanel from '../components/chat/ChatPanel';

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <h2 className="text-3xl font-bold flex-shrink-0">Group Chat</h2>
      <div className="flex-1 min-h-0" style={{ height: 'clamp(533px, calc(100vh - 250px), 1067px)' }}>
        <ChatPanel />
      </div>
    </div>
  );
}
