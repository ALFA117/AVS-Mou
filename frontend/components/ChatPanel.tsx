"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/chatStore";
import { shortenAddress } from "@/lib/format";
import type { MemberRole } from "@/lib/types";

export function ChatPanel({
  syndicateId,
  currentUser,
}: {
  syndicateId: string;
  currentUser: string;
}) {
  const { messagesBySyndicate, loadSyndicate, sendMessage, deleteMessage } = useChatStore();
  const messages = messagesBySyndicate[syndicateId] ?? [];
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSyndicate(syndicateId);
  }, [syndicateId, loadSyndicate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-96 flex-col rounded-lg border border-neutral-200">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`group flex ${m.senderId === currentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                m.senderId === currentUser ? "bg-black text-white" : "bg-neutral-100"
              }`}
            >
              <p className="text-xs opacity-60">{shortenAddress(m.senderId)}</p>
              <p>{m.content}</p>
              {m.senderId === currentUser && (
                <button
                  onClick={() => deleteMessage(syndicateId, m.id, currentUser)}
                  className="mt-1 text-xs opacity-0 underline transition group-hover:opacity-60"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          sendMessage(syndicateId, currentUser, draft.trim());
          setDraft("");
        }}
        className="flex gap-2 border-t border-neutral-200 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the syndicate…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export function roleLabel(role: MemberRole): string {
  return { founder: "Founder", member: "Member", observer: "Observer" }[role];
}
