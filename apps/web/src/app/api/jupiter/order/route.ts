import { NextResponse } from "next/server";

export const dynamic = "force-static";

const JUPITER_ORDER_URL = "https://api.jup.ag/swap/v2/order";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

type JupiterOrderRequest = {
  inputMint?: string;
  outputMint?: string;
  amount?: string;
  taker?: string;
  slippageBps?: number;
};

function normalizeMint(value: string | undefined, fallback: string) {
  const mint = value?.trim() ?? fallback;
  if (mint.length < 32 || mint.length > 64) {
    throw new Error("Invalid mint address.");
  }
  return mint;
}

function normalizeAmount(value: string | undefined) {
  const amount = value?.trim() ?? "1000000";
  if (!/^\d+$/.test(amount)) {
    throw new Error("Amount must be an integer string in base units.");
  }
  return amount;
}

function normalizeTaker(value: string | undefined) {
  const taker = value?.trim();
  if (!taker) return undefined;
  if (taker.length < 32 || taker.length > 64) {
    throw new Error("Invalid taker address.");
  }
  return taker;
}

function normalizeSlippage(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value < 0 || value > 10000) {
    throw new Error("Invalid slippageBps.");
  }
  return Math.round(value);
}

export async function POST(request: Request) {
  const apiKey = process.env.JUP_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing JUP_API_KEY in server environment." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as JupiterOrderRequest;
    const inputMint = normalizeMint(body.inputMint, SOL_MINT);
    const outputMint = normalizeMint(body.outputMint, USDC_MINT);
    const amount = normalizeAmount(body.amount);
    const taker = normalizeTaker(body.taker);
    const slippageBps = normalizeSlippage(body.slippageBps);

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
    });

    if (taker) params.set("taker", taker);
    if (typeof slippageBps === "number") params.set("slippageBps", String(slippageBps));

    const response = await fetch(`${JUPITER_ORDER_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (typeof raw?.errorMessage === "string" && raw.errorMessage) ||
            (typeof raw?.error === "string" && raw.error) ||
            `Jupiter responded ${response.status}.`,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const routePlan = Array.isArray(raw?.routePlan) ? raw.routePlan : [];
    const topRoutes = routePlan.slice(0, 4).map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const swapInfo = ((item.swapInfo ?? {}) as Record<string, unknown>);
      return {
        label: typeof swapInfo.label === "string" ? swapInfo.label : "Unknown venue",
        inputMint: typeof swapInfo.inputMint === "string" ? swapInfo.inputMint : null,
        outputMint: typeof swapInfo.outputMint === "string" ? swapInfo.outputMint : null,
        inAmount: typeof swapInfo.inAmount === "string" ? swapInfo.inAmount : null,
        outAmount: typeof swapInfo.outAmount === "string" ? swapInfo.outAmount : null,
        percent: typeof item.percent === "number" ? item.percent : null,
        bps: typeof item.bps === "number" ? item.bps : null,
        usdValue: typeof item.usdValue === "number" ? item.usdValue : null,
      };
    });

    return NextResponse.json(
      {
        request: {
          inputMint,
          outputMint,
          amount,
          taker: taker ?? null,
          slippageBps: slippageBps ?? null,
        },
        summary: {
          mode: typeof raw?.mode === "string" ? raw.mode : null,
          router: typeof raw?.router === "string" ? raw.router : null,
          inAmount: typeof raw?.inAmount === "string" ? raw.inAmount : null,
          outAmount: typeof raw?.outAmount === "string" ? raw.outAmount : null,
          inUsdValue: typeof raw?.inUsdValue === "number" ? raw.inUsdValue : null,
          outUsdValue: typeof raw?.outUsdValue === "number" ? raw.outUsdValue : null,
          priceImpact: typeof raw?.priceImpact === "number" ? raw.priceImpact : null,
          slippageBps: typeof raw?.slippageBps === "number" ? raw.slippageBps : null,
          gasless: typeof raw?.gasless === "boolean" ? raw.gasless : null,
          requestId: typeof raw?.requestId === "string" ? raw.requestId : null,
          totalTime: typeof raw?.totalTime === "number" ? raw.totalTime : null,
          transactionAvailable: typeof raw?.transaction === "string" ? raw.transaction.length > 0 : false,
        },
        topRoutes,
        raw,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jupiter order preview failed." },
      { status: 400 },
    );
  }
}
