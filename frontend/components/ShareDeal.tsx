"use client";

import { useState } from "react";

export function ShareDeal({ dealTitle, url }: { dealTitle: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = `Investing anonymously in ${dealTitle} via AVS`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-3 text-sm">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noreferrer"
        className="text-neutral-500 hover:text-neutral-800"
      >
        Share on X
      </a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-neutral-500 hover:text-neutral-800"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
