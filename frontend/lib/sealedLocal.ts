/**
 * Once a bid or vote is sealed (init_bid_permission / init_vote_permission),
 * the app's anonymous read-only TEE connection can no longer see it — which
 * is the point, but it also means the UI can't tell "you already bid/voted
 * here" from on-chain reads alone. This remembers it per browser, as a
 * convenience only: the program itself still enforces one bid/vote per
 * wallet (the PDA already exists), so losing this record is harmless.
 */

type Kind = "bid" | "vote";

function key(kind: Kind, target: string, wallet: string): string {
  return `avs.sealed.${kind}.${target}.${wallet}`;
}

export function rememberSealed(kind: Kind, target: string, wallet: string): void {
  try {
    window.localStorage.setItem(key(kind, target, wallet), String(Date.now()));
  } catch {
    // storage blocked (private mode etc.) — purely a UI hint, ignore
  }
}

export function hasSealed(kind: Kind, target: string, wallet: string | undefined | null): boolean {
  if (!wallet) return false;
  try {
    return window.localStorage.getItem(key(kind, target, wallet)) !== null;
  } catch {
    return false;
  }
}
