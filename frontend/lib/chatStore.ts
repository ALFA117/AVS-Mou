/**
 * Syndicate chat — client-side only for this pass (Task 073 scope note).
 *
 * A real implementation would use MagicBlock's ephemeral-account-chats
 * pattern (vendor/magicblock-engine-examples/ephemeral-account-chats):
 * messages as ER-only accounts, gated by the same private-permission
 * mechanism sealed-auction uses for bids, so only syndicate members can
 * decrypt/read them — matching AVS_PROJECT_MASTER.md's "Chat grupal
 * encriptado (ephemeral accounts)" requirement. That needs a fourth Anchor
 * program (mirroring sealed-auction's/private-voting's sealed-account
 * pattern) which is out of scope for this frontend-focused pass.
 *
 * What's here: messages persisted to localStorage per syndicate, so the
 * UI (member list, permissions, send/receive) is fully wired and ready to
 * swap its storage layer for the real on-chain program later.
 */
import { create } from "zustand";
import type { ChatMessage } from "./types";

const STORAGE_PREFIX = "avs.chat.v1.";

interface ChatState {
  messagesBySyndicate: Record<string, ChatMessage[]>;
  loadSyndicate: (syndicateId: string) => void;
  sendMessage: (syndicateId: string, senderId: string, content: string) => void;
  deleteMessage: (syndicateId: string, messageId: string, senderId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesBySyndicate: {},

  loadSyndicate: (syndicateId) => {
    if (typeof window === "undefined") return;
    if (get().messagesBySyndicate[syndicateId]) return; // already loaded
    const raw = window.localStorage.getItem(STORAGE_PREFIX + syndicateId);
    const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
    set((state) => ({
      messagesBySyndicate: { ...state.messagesBySyndicate, [syndicateId]: messages },
    }));
  },

  sendMessage: (syndicateId, senderId, content) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      syndicateId,
      senderId,
      content,
      timestamp: Date.now(),
    };
    set((state) => {
      const updated = [...(state.messagesBySyndicate[syndicateId] ?? []), message];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_PREFIX + syndicateId, JSON.stringify(updated));
      }
      return { messagesBySyndicate: { ...state.messagesBySyndicate, [syndicateId]: updated } };
    });
  },

  deleteMessage: (syndicateId, messageId, senderId) => {
    set((state) => {
      const current = state.messagesBySyndicate[syndicateId] ?? [];
      // Only own messages can be deleted (Task 072's "Delete: only own messages").
      const updated = current.filter((m) => !(m.id === messageId && m.senderId === senderId));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_PREFIX + syndicateId, JSON.stringify(updated));
      }
      return { messagesBySyndicate: { ...state.messagesBySyndicate, [syndicateId]: updated } };
    });
  },
}));
