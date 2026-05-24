export type LearnModuleNavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

export type LearnLectureSection = {
  heading: string;
  body: string;
};

export type LearnLectureAction = {
  href: string;
  label: string;
};

export type LearnCodeReference = {
  label: string;
  href: string;
};

export type LearnAssignment = {
  title: string;
  brief: string;
  deliverables: string[];
  liveRoute: string;
  codeRefs: LearnCodeReference[];
};

export type LearnLiveExecution = {
  heading: string;
  summary: string;
  routeHref: string;
  routeLabel: string;
  verifyHref: string;
  verifyLabel: string;
  steps: string[];
};

export type LearnQuizQuestion = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
};

export type LearnLecture = {
  slug: string;
  title: string;
  strapline: string;
  summary: string;
  lectureNumber: number;
  badges: string[];
  sections: LearnLectureSection[];
  actions: LearnLectureAction[];
  codeRefs: LearnCodeReference[];
  liveExecution: LearnLiveExecution;
  assignment: LearnAssignment;
  quiz: LearnQuizQuestion[];
};

export type LearnToolkitItem = {
  title: string;
  summary: string;
  sandboxRoute: string;
  liveRoute: string;
  verifyRoute: string;
  expectedOutcome: string;
  codeRefs: LearnCodeReference[];
};

const githubBase = "https://github.com/X-PACT/PrivateDAO/tree/main";

export const learnModuleNav: LearnModuleNavItem[] = [
  { href: "/learn/lecture-1-web2-to-solana-ui", label: "Lecture 1", shortLabel: "L1" },
  { href: "/learn/lecture-2-governance-ui", label: "Lecture 2", shortLabel: "L2" },
  { href: "/learn/lecture-3-rpc-state-and-runtime", label: "Lecture 3", shortLabel: "L3" },
  { href: "/learn/lecture-4-private-payments-gaming-and-proof", label: "Lecture 4", shortLabel: "L4" },
  { href: "/documents/frontend-solana-bootcamp-materials", label: "Materials", shortLabel: "Slides" },
  { href: "/learn/toolkit", label: "Toolkit", shortLabel: "Toolkit" },
  { href: "/learn/assignments", label: "Assignments", shortLabel: "Tasks" },
  { href: "/learn/quizzes", label: "Quizzes", shortLabel: "Quiz" },
];

export const learnLectures: LearnLecture[] = [
  {
    slug: "lecture-1-web2-to-solana-ui",
    lectureNumber: 1,
    title: "From Web2 Frontend to Solana Wallet-First UX",
    strapline: "Start from one browser shell, not from scripts.",
    summary:
      "This lecture takes a normal frontend builder from Web2 assumptions into a real Solana product path: wallet connect, corridor selection, identity-aware onboarding, and command-center navigation.",
    badges: ["Wallet-first", "Solflare + Phantom", "SNS-aware"],
    sections: [
      {
        heading: "What you’ll learn",
        body:
          "How PrivateDAO turns wallet connection, corridor selection, readable signer context, and guided navigation into a usable first-run dApp path for non-experts.",
      },
      {
        heading: "Why this matters on Solana",
        body:
          "Solana UX fails when the user lands in raw addresses, unexplained signatures, or disconnected pages. Wallet-first product shells reduce that friction and make the chain feel fast instead of hostile.",
      },
      {
        heading: "How PrivateDAO solves it",
        body:
          "PrivateDAO starts from /start, lets the user connect a Testnet wallet, recommends the right corridor, keeps SNS-style readable identity in the product story, and routes into command-center or govern without terminal work.",
      },
      {
        heading: "Try it now",
        body:
          "Connect a Testnet wallet, pick the correct corridor, then move into Govern or Command Center. The goal is to feel that a normal operator can start safely in seconds.",
      },
      {
        heading: "Check the code",
        body:
          "Review the route shell, onboarding surface, and command-center composition to see how this product path is assembled from reusable UI and wallet-aware logic.",
      },
    ],
    actions: [
      { href: "/start", label: "Open Start" },
      { href: "/command-center", label: "Open Command Center" },
      { href: "/learn/toolkit", label: "Open Toolkit" },
    ],
    codeRefs: [
      { label: "Start route", href: `${githubBase}/apps/web/src/app/start/page.tsx` },
      { label: "Getting started workspace", href: `${githubBase}/apps/web/src/components/getting-started-workspace.tsx` },
      { label: "Command Center", href: `${githubBase}/apps/web/src/app/command-center/page.tsx` },
      { label: "Wallet connect starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/wallet-connect-starter/WalletConnectStarter.tsx` },
    ],
    liveExecution: {
      heading: "Run the wallet-first path now",
      summary:
        "Connect a Testnet wallet, pick the right corridor, then move into the live shell that prepares the user for governed action instead of dropping them into docs or terminal steps.",
      routeHref: "/start",
      routeLabel: "Run wallet-first onboarding",
      verifyHref: "/dashboard",
      verifyLabel: "Open live operator state",
      steps: [
        "Connect a Testnet wallet from Start.",
        "Choose the corridor that matches governance, treasury, or analytics work.",
        "Continue into Command Center and confirm the signer context is visible and usable.",
      ],
    },
    assignment: {
      title: "Build a wallet-first entry shell",
      brief:
        "Create a page that connects a Testnet wallet, surfaces signer context, and sends the user into the correct PrivateDAO corridor without extra explanation screens.",
      deliverables: [
        "Connect wallet button with signer state",
        "Corridor selector for governance, treasury, or analytics",
        "One click into the live route",
      ],
      liveRoute: "/start",
      codeRefs: [
        { label: "Start route", href: `${githubBase}/apps/web/src/app/start/page.tsx` },
        { label: "Command Center shell", href: `${githubBase}/apps/web/src/components/command-center-live-shell.tsx` },
        { label: "Wallet connect starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/wallet-connect-starter/WalletConnectStarter.tsx` },
      ],
    },
    quiz: [
      {
        question: "Why is wallet-first UX a core Solana requirement here?",
        options: [
          "Because a signer is part of the product flow, not a backend detail.",
          "Because it replaces proof entirely.",
          "Because it avoids Testnet usage.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What should a normal user do after connecting a wallet?",
        options: [
          "Choose the right corridor and continue into the live route.",
          "Open the terminal and inspect RPC logs first.",
          "Read every protocol spec before clicking anything.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What is the first practical step in Solana wallet-first UX?",
        options: [
          "Connect the wallet and surface signer context.",
          "Deploy a new program before opening the UI.",
          "Generate a PDA before showing any interface.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why does PrivateDAO show corridor selection immediately after connect?",
        options: [
          "So the user can enter the right governance, treasury, or analytics path without confusion.",
          "So the user is forced to read all documents first.",
          "So the wallet can be disconnected faster.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What makes the starter shell production-useful instead of tutorial-only?",
        options: [
          "It routes directly into real product surfaces like Start and Command Center.",
          "It hides all runtime state until later lectures.",
          "It only works with screenshots instead of live routes.",
        ],
        correctAnswerIndex: 0,
      },
    ],
  },
  {
    slug: "lecture-2-governance-ui",
    lectureNumber: 2,
    title: "Building Governance UI: Create, Vote, Reveal, Execute",
    strapline: "Private voting should feel simple without becoming weak.",
    summary:
      "This lecture covers the full governance lifecycle in UI form: DAO creation, proposal drafting, commit-reveal voting, voice-assisted inputs, proof-linked execution, and status visibility.",
    badges: ["Commit-reveal", "Voice voting", "Judge-linked"],
    sections: [
      {
        heading: "What you’ll learn",
        body:
          "How to build a proposal panel, vote controls, reveal and execute states, and voice-assisted commands while preserving the signer boundary and privacy posture.",
      },
      {
        heading: "Why this matters on Solana",
        body:
          "Governance UX collapses when voting intent leaks too early or when execution feels like a protocol-debugging ceremony. Users need lifecycle visibility without losing privacy or fairness.",
      },
      {
        heading: "How PrivateDAO solves it",
        body:
          "PrivateDAO keeps the entire path in Govern and the workbench: create DAO, draft proposal, commit vote, reveal later, execute, and then inspect the blockchain evidence in Judge and Proof.",
      },
      {
        heading: "Try it now",
        body:
          "Open Govern, use typed or voice-assisted commands, create a proposal, run the vote lifecycle, then inspect the resulting signatures on the judge path.",
      },
      {
        heading: "Check the code",
        body:
          "Focus on the govern page, workbench client, and the voice command panel. Those files show how normal-language interaction becomes structured governance actions before the wallet signs.",
      },
    ],
    actions: [
      { href: "/govern", label: "Open Govern" },
      { href: "/judge", label: "Open Judge" },
      { href: "/proof?judge=1", label: "Open Proof" },
    ],
    codeRefs: [
      { label: "Govern route", href: `${githubBase}/apps/web/src/app/govern/page.tsx` },
      { label: "Govern workbench client", href: `${githubBase}/apps/web/src/components/govern/govern-workbench-client.tsx` },
      { label: "Voice command panel", href: `${githubBase}/apps/web/src/components/governance-voice-command-panel.tsx` },
      { label: "Proposal UI starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/proposal-ui-starter/ProposalUiStarter.tsx` },
    ],
    liveExecution: {
      heading: "Run one governance cycle now",
      summary:
        "Use the real Govern surface to draft, commit, reveal, and execute from the same product lane, then open Judge to inspect the recorded signatures and proof corridor.",
      routeHref: "/govern",
      routeLabel: "Run live governance flow",
      verifyHref: "/judge",
      verifyLabel: "Verify lifecycle in Judge",
      steps: [
        "Create or review a DAO proposal in Govern.",
        "Commit a vote, then continue into reveal and execution when the stage is available.",
        "Open Judge and Proof to inspect the signatures, lifecycle state, and captured evidence.",
      ],
    },
    assignment: {
      title: "Ship a minimal governance lifecycle surface",
      brief:
        "Build a proposal card that can move through create, vote, reveal, and execute states while keeping the user aware of privacy and signer boundaries.",
      deliverables: [
        "Proposal card with state badges",
        "Commit vote action and reveal action",
        "Execution status and proof entry CTA",
      ],
      liveRoute: "/govern",
      codeRefs: [
        { label: "Govern route", href: `${githubBase}/apps/web/src/app/govern/page.tsx` },
        { label: "Judge route", href: `${githubBase}/apps/web/src/app/judge/page.tsx` },
        { label: "Proposal UI starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/proposal-ui-starter/ProposalUiStarter.tsx` },
      ],
    },
    quiz: [
      {
        question: "Why does commit-reveal matter in this product?",
        options: [
          "It protects vote intent until the right proof stage.",
          "It removes the need for wallet signatures.",
          "It replaces runtime logs.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What is the role of voice governance here?",
        options: [
          "It reduces friction while keeping the final signer boundary intact.",
          "It executes on-chain actions without wallet approval.",
          "It hides every governance state from the user.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Which governance UI states should stay visible to a normal operator?",
        options: [
          "Create, vote, reveal, execute, and final verification state.",
          "Only the final execute button.",
          "Only backend logs and raw account data.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why should execution remain wallet-signed even with a smoother UI?",
        options: [
          "Because the cryptographic boundary still matters even when the UI is simple.",
          "Because commit-reveal is not compatible with signatures.",
          "Because Solana wallets cannot sign governance actions.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What is the correct user flow after a proposal is approved?",
        options: [
          "Open verification or proof and inspect the resulting signatures and status.",
          "Close the app because governance is finished.",
          "Hide the outcome until mainnet.",
        ],
        correctAnswerIndex: 0,
      },
    ],
  },
  {
    slug: "lecture-3-rpc-state-and-runtime",
    lectureNumber: 3,
    title: "Solana Runtime UX: Fast RPC, Diagnostics, and Activity Tracking",
    strapline: "Users trust a dApp when state updates feel honest.",
    summary:
      "This lecture explains why Fast RPC, QuickNode Streams, hosted reads, telemetry, analytics, and diagnostics are not backend trivia. They are core UX components that make Testnet activity understandable and trustworthy.",
    badges: ["Fast RPC", "QuickNode Streams", "Diagnostics"],
    sections: [
      {
        heading: "What you’ll learn",
        body:
          "How to show transaction hashes, proposal freshness, runtime diagnostics, hosted-read state, and analytics summaries after real wallet actions.",
      },
      {
        heading: "Why this matters on Solana",
        body:
          "A user does not care about RPC branding. They care that state updates quickly, retries are understandable, and a transaction can be followed into logs and proof after a signature.",
      },
      {
        heading: "How PrivateDAO solves it",
        body:
          "PrivateDAO uses dashboard, diagnostics, analytics, API status, RPC services, and reviewer packets to show the same truth from different depths. QuickNode-backed Testnet telemetry, Fast RPC, and hosted reads become visible through product behavior, not just claims.",
      },
      {
        heading: "Try it now",
        body:
          "Run a wallet action, then move into Dashboard, Diagnostics, API Status, RPC Services, and Reviewer Telemetry to see the state change, proof freshness, QuickNode stream posture, and runtime corridor in one flow.",
      },
      {
        heading: "Check the code",
        body:
          "The runtime story lives across dashboard, diagnostics, analytics, and the devnet metrics library. That is where product-facing state and infrastructure truth stay synchronized.",
      },
    ],
    actions: [
      { href: "/dashboard", label: "Open Dashboard" },
      { href: "/diagnostics", label: "Open Diagnostics" },
      { href: "/rpc-services", label: "Open RPC Services" },
      { href: "/api-status", label: "Open API Status" },
    ],
    codeRefs: [
      { label: "Dashboard route", href: `${githubBase}/apps/web/src/app/dashboard/page.tsx` },
      { label: "Diagnostics route", href: `${githubBase}/apps/web/src/app/diagnostics/page.tsx` },
      { label: "RPC services route", href: `${githubBase}/apps/web/src/app/rpc-services/page.tsx` },
      { label: "API status route", href: `${githubBase}/apps/web/src/app/api-status/page.tsx` },
      { label: "Testnet metrics", href: `${githubBase}/apps/web/src/lib/devnet-service-metrics.ts` },
      { label: "Reviewer telemetry packet", href: `${githubBase}/docs/reviewer-telemetry-packet.md` },
      { label: "Runtime activity starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/runtime-activity-starter/RuntimeActivityStarter.tsx` },
    ],
    liveExecution: {
      heading: "Run one state-and-proof check now",
      summary:
        "After a real wallet action, inspect dashboard, diagnostics, API status, RPC services, and telemetry so the user sees freshness, status, retries, QuickNode stream posture, and proof instead of a shallow success message.",
      routeHref: "/dashboard",
      routeLabel: "Open dashboard runtime",
      verifyHref: "/diagnostics",
      verifyLabel: "Open diagnostics and logs",
      steps: [
        "Perform a real wallet action first from Start or Govern.",
        "Open Dashboard to inspect the current activity and signatures.",
        "Continue into Diagnostics, API Status, and RPC Services to confirm runtime behavior, backend health, and proof freshness.",
      ],
    },
    assignment: {
      title: "Build a runtime activity widget",
      brief:
        "Create a widget that shows the last action, tx signature, live status, and a recovery hint when runtime state lags or retries are required.",
      deliverables: [
        "Last action summary",
        "Clickable Testnet transaction hash",
        "Status / retry hint / freshness indicator",
      ],
      liveRoute: "/dashboard",
      codeRefs: [
        { label: "Dashboard route", href: `${githubBase}/apps/web/src/app/dashboard/page.tsx` },
        { label: "Analytics route", href: `${githubBase}/apps/web/src/app/analytics/page.tsx` },
        { label: "Runtime activity starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/runtime-activity-starter/RuntimeActivityStarter.tsx` },
      ],
    },
    quiz: [
      {
        question: "Why does Fast RPC matter to the user experience here?",
        options: [
          "It makes proposal, proof, and payout state update quickly enough to feel trustworthy.",
          "It removes the need for analytics.",
          "It only matters to validators, not to users.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What should happen after a wallet action lands?",
        options: [
          "The user should be able to follow the hash, status, and logs.",
          "The UI should stop explaining anything.",
          "The app should hide runtime state until mainnet.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What does RPC stand for in this learning path?",
        options: [
          "Remote Procedure Call.",
          "Runtime Privacy Corridor.",
          "Rapid Program Chain.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why are diagnostics part of product UX instead of backend-only tooling?",
        options: [
          "Because they help the user understand freshness, retries, and what the chain actually recorded.",
          "Because diagnostics replace wallet signatures.",
          "Because analytics pages should never show transactions.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What makes a runtime widget useful for a non-expert?",
        options: [
          "It shows the last action, tx hash, current status, and the next recovery hint.",
          "It only displays raw JSON responses.",
          "It hides status until the session ends.",
        ],
        correctAnswerIndex: 0,
      },
    ],
  },
  {
    slug: "lecture-4-private-payments-gaming-and-proof",
    lectureNumber: 4,
    title: "Private Payments, Gaming DAO, Proof, and Agentic Rails",
    strapline: "Complex cryptography becomes simple product behavior.",
    summary:
      "This lecture ties the hardest product pieces together: MagicBlock, REFHE, ZK review, PUSD, Jupiter, Kamino, Torque MCP, Zerion-style agents, gaming rewards, and the Agentic Treasury Micropayment Rail.",
    badges: ["MagicBlock + REFHE", "PUSD + Stablecoin Treasury", "Jupiter + Kamino"],
    sections: [
      {
        heading: "What you’ll learn",
        body:
          "How PrivateDAO turns confidential treasury actions, gaming rewards, proof-linked payments, and agentic execution into browser-first product corridors instead of operator-only internals.",
      },
      {
        heading: "Why this matters on Solana",
        body:
          "The difference between a novel product and a forgettable one is whether advanced infrastructure becomes usable for a normal operator: private voting, confidential payouts, fast reads, and governed execution all in one surface.",
      },
      {
        heading: "How PrivateDAO solves it",
        body:
          "PrivateDAO maps ZK to private review and vote protection, MagicBlock to responsive private execution lanes, REFHE to confidential settlement posture, PUSD and adjacent stablecoins to payroll, grants, commerce, and gaming rewards, Jupiter and Kamino to treasury coordination, Torque to MCP-style operator rails, and the existing micropayment engine to agentic execution.",
      },
      {
        heading: "Try it now",
        body:
          "Open Security, Services, Intelligence, Judge, the PUSD stablecoin treasury layer, and the Agentic Treasury Micropayment Rail packet. The goal is to see how private decisions become reviewable payment and reward actions on Testnet.",
      },
      {
        heading: "Check the code",
        body:
          "Use the security route, the micropayment rail packet, the assistant route, and the Solana program / zk / scripts directories to study where the product boundaries meet the protocol and automation layers.",
      },
    ],
    actions: [
      { href: "/security", label: "Open Security" },
      { href: "/services", label: "Open Services" },
      { href: "/intelligence", label: "Open Gaming + Intelligence" },
      { href: "/documents/pusd-stablecoin-treasury-layer", label: "Open PUSD Treasury Layer" },
      { href: "/documents/agentic-treasury-micropayment-rail", label: "Open Micropayment Rail" },
    ],
    codeRefs: [
      { label: "Security route", href: `${githubBase}/apps/web/src/app/security/page.tsx` },
      { label: "Gaming and intelligence route", href: `${githubBase}/apps/web/src/app/intelligence/page.tsx` },
      { label: "Micropayment engine", href: `${githubBase}/scripts/lib/micropayment-engine.ts` },
      { label: "PUSD treasury layer", href: `${githubBase}/docs/pusd-stablecoin-treasury-layer.md` },
      { label: "Run micropayment rail", href: `${githubBase}/scripts/run-agentic-treasury-micropayment-rail.ts` },
      { label: "Solana program", href: `${githubBase}/programs/private-dao` },
      { label: "ZK folder", href: `${githubBase}/zk` },
      { label: "Private payment starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/private-payment-starter/PrivatePaymentStarter.tsx` },
    ],
    liveExecution: {
      heading: "Run one private treasury or gaming proof lane now",
      summary:
        "Move from Security or Services into the live payment and proof lanes, then open the agentic rail or judge route to see how complex infrastructure becomes a browser-first user action.",
      routeHref: "/security",
      routeLabel: "Run private payment corridor",
      verifyHref: "/documents/agentic-treasury-micropayment-rail",
      verifyLabel: "Open treasury rail proof",
      steps: [
        "Open Security or Services and follow the protected payout or governed reward corridor.",
        "Open Intelligence when you want to inspect the gaming and reward-facing operator lane.",
        "Continue into the agentic treasury rail to inspect repeated settlement actions.",
        "Use Judge or Proof to open the Testnet transactions and confirm what the chain recorded.",
      ],
    },
    assignment: {
      title: "Ship one private-payment or gaming reward flow",
      brief:
        "Implement either a confidential payout request surface or a gaming reward execution surface that lands in proof and judge routes after a real Testnet action.",
      deliverables: [
        "One private-payment or gaming reward UI",
        "One proof-linked CTA after execution",
        "One explanation of what stayed private and what became public",
      ],
      liveRoute: "/security",
      codeRefs: [
        { label: "Security route", href: `${githubBase}/apps/web/src/app/security/page.tsx` },
        { label: "Gaming and intelligence route", href: `${githubBase}/apps/web/src/app/intelligence/page.tsx` },
        { label: "Agentic rail doc", href: `${githubBase}/docs/agentic-treasury-micropayment-rail.md` },
        { label: "Private payment starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/private-payment-starter/PrivatePaymentStarter.tsx` },
      ],
    },
    quiz: [
      {
        question: "What is the correct product role for ZK here?",
        options: [
          "Protect sensitive intent first, then expose the right proof after execution.",
          "Hide all blockchain evidence permanently.",
          "Replace wallets and signatures.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why include agentic treasury execution in the learning path?",
        options: [
          "Because it shows how governed policy can drive many real on-chain actions without turning the user into a script operator.",
          "Because it removes governance from the product.",
          "Because it only matters for a one-off sandbox.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "What should a judge or operator understand after using the private payment lane?",
        options: [
          "What stayed private, what became public on-chain, and where the proof lives.",
          "That all payment details are hidden forever with no verification.",
          "That privacy eliminates the need for logs.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why is MagicBlock discussed in this lecture?",
        options: [
          "Because responsive execution lanes matter when advanced flows must still feel immediate in the browser.",
          "Because it replaces Solana RPC entirely.",
          "Because it removes the need for governed execution.",
        ],
        correctAnswerIndex: 0,
      },
      {
        question: "Why are Jupiter and Kamino shown inside the same product story?",
        options: [
          "Because treasury coordination, routing, and capital posture belong in one practical operator flow.",
          "Because they are only branding partners with no product role.",
          "Because gaming rewards cannot use treasury rails.",
        ],
        correctAnswerIndex: 0,
      },
    ],
  },
];

export const learnToolkitItems: LearnToolkitItem[] = [
  {
    title: "Wallet connect starter",
    summary: "The minimum shell for connecting a Testnet wallet, surfacing signer state, and moving into the product safely.",
    sandboxRoute: "/wallet-template",
    liveRoute: "/start",
    verifyRoute: "/dashboard",
    expectedOutcome: "A user can connect, see signer context, and enter the right corridor in seconds.",
    codeRefs: [
      { label: "Start route", href: `${githubBase}/apps/web/src/app/start/page.tsx` },
      { label: "Getting started workspace", href: `${githubBase}/apps/web/src/components/getting-started-workspace.tsx` },
      { label: "Wallet connect starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/wallet-connect-starter/WalletConnectStarter.tsx` },
    ],
  },
  {
    title: "Proposal UI starter",
    summary: "The governance workbench for creating proposals, voting, revealing, executing, and linking into proof.",
    sandboxRoute: "/governance-template",
    liveRoute: "/govern",
    verifyRoute: "/judge",
    expectedOutcome: "A user can run the DAO lifecycle from the browser without terminal work.",
    codeRefs: [
      { label: "Govern route", href: `${githubBase}/apps/web/src/app/govern/page.tsx` },
      { label: "Voice command panel", href: `${githubBase}/apps/web/src/components/governance-voice-command-panel.tsx` },
      { label: "Proposal UI starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/proposal-ui-starter/ProposalUiStarter.tsx` },
    ],
  },
  {
    title: "Runtime activity starter",
    summary: "The runtime visibility layer for hashes, diagnostics, freshness, analytics, and retry-aware state.",
    sandboxRoute: "/runtime-template",
    liveRoute: "/dashboard",
    verifyRoute: "/diagnostics",
    expectedOutcome: "A user can tell what happened after a wallet action and verify it on Testnet.",
    codeRefs: [
      { label: "Dashboard route", href: `${githubBase}/apps/web/src/app/dashboard/page.tsx` },
      { label: "Diagnostics route", href: `${githubBase}/apps/web/src/app/diagnostics/page.tsx` },
      { label: "Testnet metrics", href: `${githubBase}/apps/web/src/lib/devnet-service-metrics.ts` },
      { label: "Runtime activity starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/runtime-activity-starter/RuntimeActivityStarter.tsx` },
    ],
  },
  {
    title: "Private payment starter",
    summary: "The product lane for confidential treasury, payout, reward, and proof-linked payment actions.",
    sandboxRoute: "/payment-template",
    liveRoute: "/security",
    verifyRoute: "/proof?judge=1",
    expectedOutcome: "A user can understand what stayed private, what became public, and where the evidence lives.",
    codeRefs: [
      { label: "Security route", href: `${githubBase}/apps/web/src/app/security/page.tsx` },
      { label: "Micropayment rail doc", href: `${githubBase}/docs/agentic-treasury-micropayment-rail.md` },
      { label: "Micropayment engine", href: `${githubBase}/scripts/lib/micropayment-engine.ts` },
      { label: "Private payment starter template", href: `${githubBase}/templates/frontend-solana-bootcamp/private-payment-starter/PrivatePaymentStarter.tsx` },
    ],
  },
];

export function getLectureBySlug(slug: string) {
  return learnLectures.find((lecture) => lecture.slug === slug);
}
