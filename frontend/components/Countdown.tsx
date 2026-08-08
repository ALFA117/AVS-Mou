"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

/** Live countdown to a unix-seconds deadline. Ticks every second. */
export function Countdown({ deadlineTs }: { deadlineTs: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const closed = deadlineTs * 1000 <= now;
  const urgent = !closed && deadlineTs * 1000 - now < 60 * 60 * 1000; // < 1h left

  return (
    <span
      className={
        closed
          ? "text-muted-foreground"
          : urgent
            ? "font-mono-avs text-red-600 dark:text-red-400"
            : "font-mono-avs text-green-700 dark:text-green-400"
      }
    >
      {formatCountdown(deadlineTs, now)}
    </span>
  );
}
