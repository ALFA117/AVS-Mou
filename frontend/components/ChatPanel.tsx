"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useChatStore } from "@/lib/chatStore";
import { shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
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
  const { t } = useTranslation();

  useEffect(() => {
    loadSyndicate(syndicateId);
  }, [syndicateId, loadSyndicate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-96 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" strokeWidth={2} />
        <h3 className="font-heading text-sm font-semibold text-card-foreground">
          {t("chatPanel.title")}
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">{t("chatPanel.noMessages")}</p>
        )}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className={`group flex ${m.senderId === currentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                m.senderId === currentUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="font-mono-avs text-xs opacity-70">{shortenAddress(m.senderId)}</p>
              <p>{m.content}</p>
              {m.senderId === currentUser && (
                <button
                  onClick={() => deleteMessage(syndicateId, m.id, currentUser)}
                  className="mt-1 flex cursor-pointer items-center gap-1 text-xs opacity-0 underline transition group-hover:opacity-70 group-focus-within:opacity-70 focus-visible:opacity-100"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2} />
                  {t("chatPanel.delete")}
                </button>
              )}
            </div>
          </motion.div>
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
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chatPanel.messagePlaceholder")}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
          {t("chatPanel.send")}
        </motion.button>
      </form>
    </div>
  );
}

export function roleLabel(role: MemberRole, t: (key: string) => string): string {
  return { founder: t("chatPanel.roleFounder"), member: t("chatPanel.roleMember"), observer: t("chatPanel.roleObserver") }[role];
}
