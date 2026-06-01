import { getOraclePriceProvider } from "@/lib/oracle/oracle-price-provider";
import { getTokenIntelligenceProvider, type TokenDecisionUseCase } from "@/lib/tokens/token-intelligence-provider";

type AssetContextCardProps = {
  symbol?: string;
  amount?: string;
  useCase: TokenDecisionUseCase;
};

function priceUseCase(useCase: TokenDecisionUseCase) {
  if (useCase === "vesting") return "vesting";
  if (useCase === "payout") return "payout";
  return "treasury";
}

export async function AssetContextCard({ symbol = "USDC", amount = "10000", useCase }: AssetContextCardProps) {
  const tokenProvider = getTokenIntelligenceProvider();
  const priceProvider = getOraclePriceProvider();
  const [asset, price] = await Promise.all([
    tokenProvider.analyzeAsset({ symbol, useCase }),
    priceProvider.getPriceContext({ symbol, amount, useCase: priceUseCase(useCase) }),
  ]);

  return (
    <div className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.07] p-5">
      <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Asset context before voting</div>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">PrivateDAO checks context before decisions.</h3>
      <p className="mt-3 text-sm leading-7 text-white/64">
        Before a proposal touches a payout, treasury action, or vesting plan, members see the asset context in plain language.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {asset.labels.map((label) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-sm font-semibold text-white/82">
            {label}
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-sm font-semibold text-white/82">
          {price.label}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/62">
        Token: <span className="font-semibold text-white">{asset.canonicalSymbol}</span>
        {price.usdValue !== undefined ? <span> · Estimated value: ${price.usdValue.toLocaleString()}</span> : null}
        <span> · Proceed to private vote when the review looks right.</span>
      </div>
    </div>
  );
}
