'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { REACTION_EMOJIS } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { useChaosStore } from '@/stores/useChaosStore';

export function RoomChat({ enabled }: { enabled: boolean }) {
  const [text, setText] = useState('');
  const chatMessages = useChaosStore((s) => s.chatMessages);
  const reactions = useChaosStore((s) => s.reactions);
  const socket = getChaosSocket();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !enabled) return;
    socket.emit('chat:send', { content: text.trim() }, (res) => {
      if (res?.ok) setText('');
    });
  };

  const sendReaction = (emoji: (typeof REACTION_EMOJIS)[number]) => {
    socket.emit('reaction:send', { emoji });
  };

  return (
    <div className="chaos-card p-4 flex flex-col h-[380px] lg:h-full lg:flex-1 lg:min-h-0 overflow-hidden">
      <div className="flex items-center justify-between pb-2.5 border-b border-chaos-border dark:border-chaos-dark-border">
        <h3 className="font-bold text-sm">Room Chat</h3>
        {reactions.length > 0 && (
          <div className="flex items-center gap-1 text-sm overflow-hidden">
            {reactions.slice(-4).map((r) => (
              <span key={r.id} title={r.playerName} className="animate-bounce">
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reactions Bar */}
      <div className="flex items-center justify-between gap-1 py-2 border-b border-chaos-border dark:border-chaos-dark-border overflow-x-auto">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="min-w-[36px] min-h-[36px] rounded-lg hover:bg-chaos-bg dark:hover:bg-chaos-dark-elevated text-lg flex items-center justify-center transition-transform active:scale-125"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2.5 text-sm">
        {chatMessages.length === 0 ? (
          <p className="text-xs text-chaos-text-muted text-center py-6">
            Say hello to the room!
          </p>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.type === 'system'
                  ? 'text-xs text-chaos-blue dark:text-chaos-dark-blue font-medium bg-chaos-blue-soft/60 dark:bg-chaos-dark-elevated/60 px-2.5 py-1.5 rounded-lg'
                  : 'space-y-0.5'
              }
            >
              {msg.type === 'user' && (
                <span className="font-bold text-xs text-chaos-text-secondary dark:text-chaos-dark-text-secondary mr-1.5">
                  {msg.senderName}:
                </span>
              )}
              <span className="break-words">{msg.content}</span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="pt-2 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!enabled}
          placeholder={enabled ? 'Send a message...' : 'Chat disabled by host'}
          className="flex-1 px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-chaos-blue"
        />
        <button
          type="submit"
          disabled={!enabled || !text.trim()}
          aria-label="Send message"
          className="chaos-btn-primary px-3.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
