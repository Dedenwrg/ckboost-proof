"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  scriptToAddress,
  type Channel,
  type FiberBrowserNode,
  type GetPaymentResult,
} from "@fiber-pay/sdk/browser";
import {
  bottle,
  channelFundingCkb,
  connectAndOpenChannel,
  readChannel,
  ready,
  startRole,
} from "../lib/fiber";
import { readTestnetBalance } from "../lib/channel-funding";
import {
  checkBrowserCapabilities,
  type BrowserCapabilities,
} from "../lib/browser-capabilities";
import { createBrowserNodeSession } from "../lib/node-session";
import {
  encryptedBuyerProfile,
  encryptedSellerProfile,
  savedNodeIdentifier,
} from "../lib/progress";
import {
  LIQUIDITY_TRANSFER_SHANNONS,
  hexQuantity,
} from "../lib/payment-config";
import {
  evaluateConnectionReadiness,
  type AccountState,
  type ChannelState,
  type ConnectionDecision,
  type ConnectionSnapshot,
  type FinancialOperationState,
} from "../lib/connection-readiness";
import { createBoundedPoller } from "../lib/connection-polling";

export type Role = "buyer" | "seller";
export type OnboardingStage =
  | "idle"
  | "checking"
  | "starting"
  | "connecting"
  | "funding"
  | "channels"
  | "ready"
  | "error";

type FiberContextValue = {
  loaded: boolean;
  busy: boolean;
  addresses: Partial<Record<Role, string>>;
  connected: Partial<Record<Role, boolean>>;
  channels: Partial<Record<Role, Channel>>;
  routeReady: boolean;
  status: string;
  error: string;
  capabilities: BrowserCapabilities | null;
  onboardingStage: OnboardingStage;
  hasSavedProfiles: boolean;
  balances: Partial<Record<Role, bigint>>;
  openingChannels: Record<Role, boolean>;
  decision: ConnectionDecision;
  profileVersion: number;
  channelFundingCkb: bigint;
  run: (action: () => Promise<void>) => Promise<void>;
  start: (role: Role) => Promise<void>;
  connectAll: () => Promise<void>;
  open: (role: Role) => Promise<void>;
  checkBalance: (role: Role, options?: { quiet?: boolean }) => Promise<void>;
  refresh: (role: Role) => Promise<void>;
  moveLiquidity: () => Promise<void>;
  getNode: (role: Role) => FiberBrowserNode | undefined;
  setStatus: (message: string) => void;
};

const FiberContext = createContext<FiberContextValue | null>(null);

export function FiberProvider({ children }: { children: React.ReactNode }) {
  const nodes = useRef<Partial<Record<Role, FiberBrowserNode>>>({});
  const sessions = useRef<
    Partial<Record<Role, ReturnType<typeof createBrowserNodeSession>>>
  >({});
  const locked = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState<Partial<Record<Role, string>>>({});
  const [connected, setConnected] = useState<Partial<Record<Role, boolean>>>(
    {},
  );
  const [channels, setChannels] = useState<Partial<Record<Role, Channel>>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [profileVersion, setProfileVersion] = useState(0);
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(
    null,
  );
  const [onboardingStage, setOnboardingStage] =
    useState<OnboardingStage>("idle");
  const [hasSavedProfiles, setHasSavedProfiles] = useState(false);
  const [balances, setBalances] = useState<Partial<Record<Role, bigint>>>({});
  const [pollVersion, setPollVersion] = useState(0);
  const [accountStates, setAccountStates] = useState<
    Record<Role, AccountState>
  >({ buyer: "missing", seller: "missing" });
  const [channelOperations, setChannelOperations] = useState<
    Record<Role, boolean>
  >({ buyer: false, seller: false });
  const [financialOperation, setFinancialOperation] =
    useState<FinancialOperationState>("idle");
  const autoRestoreStarted = useRef(false);

  useEffect(() => {
    const support = checkBrowserCapabilities();
    setCapabilities(support);
    setOnboardingStage(support.supported ? "idle" : "error");
    setHasSavedProfiles(
      Boolean(
        savedNodeIdentifier(localStorage, encryptedBuyerProfile) &&
        savedNodeIdentifier(localStorage, encryptedSellerProfile),
      ),
    );
    setLoaded(true);
    const owned = sessions.current;
    const stop = () => {
      for (const session of Object.values(owned))
        void session.stop().catch(() => {});
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
      nodes.current = {};
      sessions.current = {};
    };
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Action failed. Check status before retrying a transfer.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(async (role: Role) => {
    const node = nodes.current[role];
    if (!node) return;
    try {
      const channel = await readChannel(node);
      const { peers } = await node.listPeers();
      setConnected((previous) => ({
        ...previous,
        [role]: peers.some(
          (peer) =>
            peer.pubkey.replace(/^0x/i, "").toLowerCase() ===
            bottle.pubkey.slice(2),
        ),
      }));
      setChannels((previous) => ({ ...previous, [role]: channel }));
      if (channel && ready(channel))
        setChannelOperations((previous) => ({ ...previous, [role]: false }));
    } catch (failure) {
      setConnected((previous) => ({ ...previous, [role]: false }));
      throw failure;
    }
  }, []);

  const start = useCallback(async (role: Role) => {
    if (nodes.current[role]) return;
    setAccountStates((previous) => ({ ...previous, [role]: "starting" }));
    const session = (sessions.current[role] ??= createBrowserNodeSession());
    let started: FiberBrowserNode | undefined;
    try {
      await session.start(
        role === "buyer" ? encryptedBuyerProfile : encryptedSellerProfile,
        async (track) => {
          started = await startRole(role, track);
        },
      );
      if (!started) return;
      nodes.current[role] = started;
      const info = await started.nodeInfo();
      setAddresses((previous) => ({
        ...previous,
        [role]: scriptToAddress(info.default_funding_lock_script, "testnet"),
      }));
      setAccountStates((previous) => ({ ...previous, [role]: "running" }));
      if (role === "seller") {
        const id = savedNodeIdentifier(localStorage, encryptedSellerProfile);
        const saved = sessionStorage.getItem(
          `fiber-docs:encrypted-inbound:${id}`,
        );
        if (saved)
          setFinancialOperation(
            saved === "submitting" ? "uncertain" : "pending",
          );
      }
      setProfileVersion((version) => version + 1);
    } catch (failure) {
      setAccountStates((previous) => ({ ...previous, [role]: "error" }));
      throw failure;
    }
  }, []);

  const open = useCallback(
    async (role: Role) => {
      const node = nodes.current[role];
      if (!node) return;
      const channel = await connectAndOpenChannel(node, () => {
        setChannelOperations((previous) => ({ ...previous, [role]: true }));
      });
      setChannels((previous) => ({ ...previous, [role]: channel }));
      await refresh(role);
      setStatus(
        channel && ready(channel)
          ? "Channel ready."
          : "Opening submitted. Check channel status after confirmation.",
      );
      setOnboardingStage(channel && ready(channel) ? "channels" : "connecting");
      setPollVersion((version) => version + 1);
    },
    [refresh],
  );

  const checkBalance = useCallback(
    async (role: Role, options?: { quiet?: boolean }) => {
      const node = nodes.current[role];
      if (!node)
        throw new Error("Start this account before checking its balance.");
      const balance = await readTestnetBalance(node);
      setBalances((previous) => ({ ...previous, [role]: balance }));
      if (!options?.quiet)
        setStatus(`${role === "buyer" ? "Reader" : "Seller"} balance checked.`);
    },
    [],
  );

  const connectAll = useCallback(async () => {
    const support = checkBrowserCapabilities();
    setCapabilities(support);
    if (!support.supported) {
      setOnboardingStage("error");
      throw new Error(support.issues[0]);
    }
    try {
      setOnboardingStage("starting");
      await start("buyer");
      await start("seller");
      setHasSavedProfiles(true);
      setOnboardingStage("connecting");
      await Promise.all(
        (["buyer", "seller"] as const).map(async (role) => {
          const node = nodes.current[role];
          if (node) await node.connectPeer(bottle);
        }),
      );
      await Promise.all([refresh("buyer"), refresh("seller")]);
      const buyerChannel = await readChannel(nodes.current.buyer!);
      const sellerChannel = await readChannel(nodes.current.seller!);
      if (!buyerChannel || !sellerChannel) {
        setOnboardingStage("funding");
        setStatus(
          "Accounts are ready. Fund each address, then open the missing channels.",
        );
      } else if (ready(buyerChannel) && ready(sellerChannel)) {
        setOnboardingStage("channels");
        setStatus("Accounts restored. Checking payment liquidity.");
      } else {
        setOnboardingStage("connecting");
        setStatus(
          "Channels are opening. UNSEAL will keep checking their status.",
        );
      }
      setPollVersion((version) => version + 1);
    } catch (failure) {
      setOnboardingStage("error");
      throw failure;
    }
  }, [refresh, start]);

  useEffect(() => {
    if (
      !loaded ||
      !hasSavedProfiles ||
      !capabilities?.supported ||
      onboardingStage !== "idle" ||
      autoRestoreStarted.current
    )
      return;
    autoRestoreStarted.current = true;
    void run(connectAll);
  }, [
    loaded,
    hasSavedProfiles,
    capabilities,
    onboardingStage,
    run,
    connectAll,
  ]);

  useEffect(() => {
    if (!pollVersion) return;
    const poller = createBoundedPoller(() =>
      Promise.all(
        (["buyer", "seller"] as const).map((role) =>
          nodes.current[role] ? refresh(role) : Promise.resolve(),
        ),
      ),
    );
    poller.start();
    return poller.stop;
  }, [pollVersion, refresh]);

  const moveLiquidity = useCallback(async () => {
    const node = nodes.current.seller;
    if (!node) return;
    const id = savedNodeIdentifier(localStorage, encryptedSellerProfile);
    const storageKey = `fiber-docs:encrypted-inbound:${id}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing === "submitting") {
      setFinancialOperation("uncertain");
      throw new Error(
        "Transfer outcome unknown. Review payment history before sending again.",
      );
    }
    setFinancialOperation("pending");
    let result: GetPaymentResult;
    try {
      if (existing) {
        result = await node.getPayment({
          payment_hash: existing as `0x${string}`,
        });
      } else {
        sessionStorage.setItem(storageKey, "submitting");
        result = await node.sendPayment({
          target_pubkey: bottle.pubkey,
          amount: hexQuantity(LIQUIDITY_TRANSFER_SHANNONS),
          keysend: true,
        });
        sessionStorage.setItem(storageKey, result.payment_hash);
      }
      if (!["Success", "Failed"].includes(result.status)) {
        result = await node.waitForPayment(result.payment_hash, {
          timeout: 60_000,
          interval: 1_000,
        });
      }
    } catch (failure) {
      setFinancialOperation("uncertain");
      throw failure;
    }
    if (result.status === "Failed") sessionStorage.removeItem(storageKey);
    setFinancialOperation(
      result.status === "Success" || result.status === "Failed"
        ? "idle"
        : "pending",
    );
    setStatus(`Liquidity transfer: ${result.status}`);
    await refresh("seller");
  }, [refresh]);

  const channelState = useCallback(
    (channel: Channel | undefined): ChannelState => {
      if (!channel) return "missing";
      if (ready(channel)) return "ready";
      const name = channel.state.state_name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      if (name.includes("fail") || name.includes("closed")) return "failed";
      return name ? "opening" : "unknown";
    },
    [],
  );

  const connectionSnapshot = useMemo<ConnectionSnapshot>(
    () => ({
      capabilities:
        capabilities === null
          ? "checking"
          : capabilities.supported
            ? "supported"
            : "unsupported",
      roles: {
        buyer: {
          account: accountStates.buyer,
          peerConnected: Boolean(connected.buyer),
          channel:
            channelOperations.buyer &&
            !(channels.buyer && ready(channels.buyer))
              ? "opening"
              : channelState(channels.buyer),
          onChainBalance: balances.buyer ?? null,
          localBalance: channels.buyer
            ? BigInt(channels.buyer.local_balance)
            : null,
          remoteBalance: channels.buyer
            ? BigInt(channels.buyer.remote_balance)
            : null,
        },
        seller: {
          account: accountStates.seller,
          peerConnected: Boolean(connected.seller),
          channel:
            channelOperations.seller &&
            !(channels.seller && ready(channels.seller))
              ? "opening"
              : channelState(channels.seller),
          onChainBalance: balances.seller ?? null,
          localBalance: channels.seller
            ? BigInt(channels.seller.local_balance)
            : null,
          remoteBalance: channels.seller
            ? BigInt(channels.seller.remote_balance)
            : null,
        },
      },
      operation: financialOperation,
    }),
    [
      capabilities,
      accountStates,
      connected,
      channels,
      balances,
      channelOperations,
      financialOperation,
      channelState,
    ],
  );
  const decision = useMemo(
    () => evaluateConnectionReadiness(connectionSnapshot),
    [connectionSnapshot],
  );
  const routeReady = decision.ready;

  useEffect(() => {
    if (routeReady) setOnboardingStage("ready");
  }, [routeReady]);

  useEffect(() => {
    if (!routeReady) return;
    const timer = window.setInterval(() => {
      void Promise.allSettled((["buyer", "seller"] as const).map(refresh));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [routeReady, refresh]);

  const value = useMemo<FiberContextValue>(
    () => ({
      loaded,
      busy,
      addresses,
      connected,
      channels,
      routeReady,
      status,
      error,
      profileVersion,
      capabilities,
      onboardingStage,
      hasSavedProfiles,
      balances,
      openingChannels: channelOperations,
      decision,
      channelFundingCkb,
      run,
      start,
      connectAll,
      open,
      checkBalance,
      refresh,
      moveLiquidity,
      getNode: (role) => nodes.current[role],
      setStatus,
    }),
    [
      loaded,
      busy,
      addresses,
      connected,
      channels,
      routeReady,
      status,
      error,
      profileVersion,
      capabilities,
      onboardingStage,
      hasSavedProfiles,
      balances,
      channelOperations,
      decision,
      run,
      start,
      connectAll,
      open,
      checkBalance,
      refresh,
      moveLiquidity,
    ],
  );

  return (
    <FiberContext.Provider value={value}>{children}</FiberContext.Provider>
  );
}

export function useFiber() {
  const context = useContext(FiberContext);
  if (!context) throw new Error("useFiber must be used inside FiberProvider.");
  return context;
}
