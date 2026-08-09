/** Formatting helpers shared across deal/dashboard/vote pages. */

const FUNDING_DECIMALS = 6; // matches devnet USDC-style mints used in .env examples

export function formatTokenAmount(raw: string | number, decimals = FUNDING_DECIMALS): string {
  const value = Number(raw) / 10 ** decimals;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function formatEquity(raw: string | number, totalSupply = 1_000_000_000_000): string {
  const pct = (Number(raw) / totalSupply) * 100;
  return `${pct.toFixed(4)}%`;
}

export function formatCountdown(deadlineTs: number, now = Date.now()): string {
  const remainingMs = deadlineTs * 1000 - now;
  if (remainingMs <= 0) return "Closed";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}
