export type FriendlyChannelProgress = {
  step: number;
  total: 6;
  title: string;
  description: string;
};

const stages: Record<string, Omit<FriendlyChannelProgress, "total">> = {
  NEGOTIATING_FUNDING: {
    step: 1,
    title: "Agreeing on payment setup",
    description:
      "Your account and the payment network are agreeing on the setup details.",
  },
  COLLABORATING_FUNDING_TX: {
    step: 2,
    title: "Preparing your Testnet deposit",
    description:
      "The network is preparing the transaction that will secure your payment funds.",
  },
  SIGNING_COMMITMENT: {
    step: 3,
    title: "Securing your balance",
    description:
      "Your starting balance is being protected before payments are enabled.",
  },
  AWAITING_TX_SIGNATURES: {
    step: 4,
    title: "Finalizing setup approval",
    description:
      "Both sides are completing the final approval before network confirmation.",
  },
  AWAITING_CHANNEL_READY: {
    step: 5,
    title: "Waiting for network confirmation",
    description:
      "Your setup has been submitted. Payments stay paused until confirmation finishes.",
  },
  CHANNEL_READY: {
    step: 6,
    title: "Payment connection ready",
    description: "This account can now use fast Testnet payments.",
  },
};

export function friendlyChannelProgress(
  stateName: string,
): FriendlyChannelProgress {
  const normalized = stateName
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  const stage = stages[normalized];
  if (stage) return { ...stage, total: 6 };
  return {
    step: 1,
    total: 6,
    title: "Preparing your payment connection",
    description:
      "The network is working on the next setup step. No action is needed yet.",
  };
}
