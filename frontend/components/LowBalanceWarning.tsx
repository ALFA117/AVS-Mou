import { CircleAlert } from "lucide-react";
import { isLowBalance } from "@/lib/solBalance";
import { useTranslation } from "@/lib/LanguageContext";

export function LowBalanceWarning({ solBalance }: { solBalance: number | null }) {
  const { t } = useTranslation();
  if (!isLowBalance(solBalance)) return null;

  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <p>
        {t("common.lowBalanceWarning", { balance: (solBalance as number).toFixed(4) })}{" "}
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2"
        >
          {t("common.lowBalanceFaucetLink")}
        </a>
      </p>
    </div>
  );
}
