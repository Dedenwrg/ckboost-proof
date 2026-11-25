export const SHANNONS_PER_CKB = 100_000_000n;

export const ARTICLE_PRICE_SHANNONS = 1n * SHANNONS_PER_CKB;
export const MAX_ROUTING_FEE_SHANNONS = 1n * SHANNONS_PER_CKB;
export const READER_MIN_OUTBOUND_SHANNONS = ARTICLE_PRICE_SHANNONS + MAX_ROUTING_FEE_SHANNONS;
export const SELLER_MIN_INBOUND_SHANNONS = ARTICLE_PRICE_SHANNONS;
export const CHANNEL_FUNDING_CKB = 500n;
export const CHANNEL_FUNDING_SHANNONS = CHANNEL_FUNDING_CKB * SHANNONS_PER_CKB;
export const LIQUIDITY_TRANSFER_CKB = 5n;
export const LIQUIDITY_TRANSFER_SHANNONS = LIQUIDITY_TRANSFER_CKB * SHANNONS_PER_CKB;

export const hexQuantity = (value: bigint) => `0x${value.toString(16)}` as `0x${string}`;

const maxInvoiceAmount = (1n << 128n) - 1n;

export function parseArticlePrice(value: string) {
  const match = /^(\d{1,31})(?:\.(\d{1,8}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = BigInt(match[1]) * SHANNONS_PER_CKB + BigInt((match[2] ?? '').padEnd(8, '0'));
  return amount > 0n && amount <= maxInvoiceAmount ? amount : null;
}

export function formatArticlePrice(amount: bigint) {
  const whole = amount / SHANNONS_PER_CKB;
  const fraction = (amount % SHANNONS_PER_CKB).toString().padStart(8, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function articleLiquidityIssue(amount: bigint, outbound: bigint, inbound: bigint) {
  if (outbound < amount + MAX_ROUTING_FEE_SHANNONS) {
    return 'The Reading account needs more payment capacity to cover this price and the maximum routing fee.';
  }
  if (inbound < amount) return 'The Publishing account needs more capacity to receive this payment.';
  return null;
}
