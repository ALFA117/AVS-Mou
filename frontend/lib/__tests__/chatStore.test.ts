import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/lib/chatStore";

const SYNDICATE = "SyndicateAAA";
const ALICE = "AliceWalletXXX";
const BOB = "BobWalletYYY";

function reset() {
  useChatStore.setState({ messagesBySyndicate: {} });
  window.localStorage.clear();
}

describe("chatStore", () => {
  beforeEach(reset);

  it("starts empty for an unloaded syndicate", () => {
    expect(useChatStore.getState().messagesBySyndicate[SYNDICATE]).toBeUndefined();
  });

  it("sendMessage appends a message and persists it to localStorage", () => {
    useChatStore.getState().sendMessage(SYNDICATE, ALICE, "gm syndicate");
    const messages = useChatStore.getState().messagesBySyndicate[SYNDICATE];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ senderId: ALICE, content: "gm syndicate" });

    const persisted = JSON.parse(window.localStorage.getItem("avs.chat.v1." + SYNDICATE)!);
    expect(persisted).toHaveLength(1);
  });

  it("loadSyndicate hydrates from localStorage without duplicating an already-loaded syndicate", () => {
    useChatStore.getState().sendMessage(SYNDICATE, ALICE, "first");
    // Simulate a fresh page load: reset in-memory state, keep localStorage.
    useChatStore.setState({ messagesBySyndicate: {} });
    useChatStore.getState().loadSyndicate(SYNDICATE);
    expect(useChatStore.getState().messagesBySyndicate[SYNDICATE]).toHaveLength(1);

    // Calling load again (e.g. remount) must not wipe or duplicate messages.
    useChatStore.getState().loadSyndicate(SYNDICATE);
    expect(useChatStore.getState().messagesBySyndicate[SYNDICATE]).toHaveLength(1);
  });

  it("deleteMessage only removes the sender's own message (task 072 rule)", () => {
    useChatStore.getState().sendMessage(SYNDICATE, ALICE, "alice's message");
    useChatStore.getState().sendMessage(SYNDICATE, BOB, "bob's message");
    const [aliceMsg] = useChatStore.getState().messagesBySyndicate[SYNDICATE];

    // Bob cannot delete Alice's message.
    useChatStore.getState().deleteMessage(SYNDICATE, aliceMsg.id, BOB);
    expect(useChatStore.getState().messagesBySyndicate[SYNDICATE]).toHaveLength(2);

    // Alice can delete her own.
    useChatStore.getState().deleteMessage(SYNDICATE, aliceMsg.id, ALICE);
    const remaining = useChatStore.getState().messagesBySyndicate[SYNDICATE];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].senderId).toBe(BOB);
  });

  it("keeps separate message threads per syndicate", () => {
    useChatStore.getState().sendMessage(SYNDICATE, ALICE, "in syndicate A");
    useChatStore.getState().sendMessage("SyndicateB", ALICE, "in syndicate B");
    expect(useChatStore.getState().messagesBySyndicate[SYNDICATE]).toHaveLength(1);
    expect(useChatStore.getState().messagesBySyndicate["SyndicateB"]).toHaveLength(1);
  });
});
