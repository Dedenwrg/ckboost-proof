"use client";

import { CopyButton } from "../../components/ui/CopyButton";
import { shortenAddress } from "../../lib/address";
import { ready } from "../../lib/fiber";
import {
  MAX_ROUTING_FEE_SHANNONS,
  SHANNONS_PER_CKB,
} from "../../lib/payment-config";
import { useFiber } from "../../providers/FiberProvider";

const accounts = [
  { role: "buyer", name: "Reading", description: "Buy and unlock articles." },
  {
    role: "seller",
    name: "Publishing",
    description: "Receive payments for your articles.",
  },
] as const;

function formatCkb(value: string | bigint) {
  const shannons = BigInt(value);
  const whole = shannons / SHANNONS_PER_CKB;
  const fraction = String(shannons % SHANNONS_PER_CKB)
    .padStart(8, "0")
    .replace(/0+$/, "");
  return `${whole.toLocaleString("en")}${fraction ? `.${fraction}` : ""} CKB`;
}

export default function SetupPage() {
  const fiber = useFiber();
  const { routeReady, busy, decision, loaded, hasSavedProfiles } = fiber;
  const checking = !loaded || decision.blocker === "capability-check" || busy;
  const headline = routeReady
    ? "Payments are ready"
    : checking
      ? "Checking payments…"
      : hasSavedProfiles
        ? "Payments need attention"
        : "Payments are not set up yet";

  return (
    <section className="setup-shell">
      <div className="studio-intro">
        <p className="eyebrow">CKB TESTNET</p>
        <h1>Payments</h1>
      </div>
      <section
        className="connection-banner payment-status"
        data-ready={routeReady}
      >
        <div role="status">
          <h2>{headline}</h2>
          <p>
            {routeReady
              ? "You can buy articles and receive payments."
              : checking
                ? "We’re checking your payment accounts."
                : "Buying and receiving payments are currently unavailable."}
          </p>
        </div>
      </section>
      <h2>Your accounts</h2>
      <div className="studio-options">
        {accounts.map(({ role, name, description }) => {
          const address = fiber.addresses[role];
          const channel = fiber.channels[role];
          const channelReady = channel && ready(channel);
          const connected = fiber.connected[role] === true;
          const capacity = channelReady
            ? role === "buyer"
              ? channel.local_balance
              : channel.remote_balance
            : undefined;
          return (
            <section className="studio-panel" key={role}>
              <h2>{name}</h2>
              <p>{description}</p>
              <dl className="payment-details">
                <dt>
                  {role === "buyer"
                    ? "Available to send"
                    : "Capacity to receive"}
                </dt>
                <dd>
                  {capacity === undefined ? "Unavailable" : formatCkb(capacity)}
                  {capacity !== undefined && !connected && (
                    <small>Last known</small>
                  )}
                </dd>
                <dt>Payment channel</dt>
                <dd>
                  {channelReady
                    ? connected
                      ? "Ready"
                      : "Offline"
                    : fiber.openingChannels[role]
                      ? "Preparing"
                      : "Unavailable"}
                </dd>
              </dl>
              {address ? (
                <div className="funding-address">
                  <span>
                    <small>Testnet address</small>
                    <strong>{shortenAddress(address)}</strong>
                  </span>
                  <CopyButton
                    value={address}
                    label={`Copy ${name.toLowerCase()} address`}
                  />
                </div>
              ) : (
                <p className="muted">
                  {checking
                    ? "Checking account…"
                    : "Address available after setup."}
                </p>
              )}
            </section>
          );
        })}
      </div>
      <section className="studio-panel">
        <h2>Article payments</h2>
        <dl className="payment-details">
          <dt>Article prices</dt>
          <dd>Set by each writer</dd>
          <dt>Maximum routing fee</dt>
          <dd>{formatCkb(MAX_ROUTING_FEE_SHANNONS)}</dd>
        </dl>
      </section>
    </section>
  );
}
