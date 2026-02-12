import ChatPanel from '../components/chat/ChatPanel';

export default function ChatPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Group Chat</h2>
      <ChatPanel />
    </div>
  );
}
