import type { FiberBrowserNode, SendPaymentParams } from '@fiber-pay/sdk/browser';
import type { EncryptedOffer } from './offer';
import { assertEncryptedInvoiceNotExpired, EncryptedPaymentRejectedError, submitEncryptedPayment } from './payment-submission.ts';
import { ARTICLE_PRICE_SHANNONS, MAX_ROUTING_FEE_SHANNONS, hexQuantity } from './payment-config.ts';

export async function validateOffer(node: FiberBrowserNode, offer: EncryptedOffer, expectedAmount = ARTICLE_PRICE_SHANNONS) {
  const { invoice } = await node.parseInvoice({ invoice: offer.invoice });
  if (expectedAmount <= 0n || invoice.currency !== 'Fibt' || BigInt(invoice.amount ?? '0x0') !== expectedAmount
    || invoice.data.payment_hash.toLowerCase() !== offer.paymentHash.toLowerCase()) {
    throw new Error('The Invoice does not match this encrypted offer.');
  }
  return invoice;
}

export async function payForOffer(node: FiberBrowserNode, offer: EncryptedOffer, attempt: string,
  recordAttempt: (hash: string) => void, retry = false, expectedAmount = ARTICLE_PRICE_SHANNONS) {
  const invoice = await validateOffer(node, offer, expectedAmount);
  if (attempt) {
    if (attempt.toLowerCase() !== offer.paymentHash.toLowerCase()) throw new Error('Restore the offer for the previous payment.');
    const previous = await node.getPayment({ payment_hash: offer.paymentHash });
    if (!retry || previous.status !== 'Failed') return previous;
  }
  assertEncryptedInvoiceNotExpired(invoice);
  // A storage failure aborts before a payment can be submitted.
  recordAttempt(offer.paymentHash);
  try {
    return await submitEncryptedPayment(node, offer.paymentHash, { invoice: offer.invoice,
      hop_hints: [offer.lastHop] as unknown as NonNullable<SendPaymentParams['hop_hints']>,
      max_fee_amount: hexQuantity(MAX_ROUTING_FEE_SHANNONS), max_parts: '0x1' });
  } catch (error) {
    if (error instanceof EncryptedPaymentRejectedError) recordAttempt('');
    throw error;
  }
}
