# UNSEAL

**Free previews. One-time payments. Full stories.**

UNSEAL is an article marketplace demo built for Fiber Quest 2 (Advanced). Writers publish encrypted articles, readers preview them for free, and a successful Fiber Testnet payment unlocks the full story in the browser.

<!-- Add the Quest 2 screen-recording link here before submission. -->

## What changed from the starter

UNSEAL turns the [encrypted data payment starter](https://www.fiber.world/docs/build/encrypted-data-payment) into a complete writing and reading flow.

| Feature | What you can do |
| --- | --- |
| **Seller Studio** | Write from scratch or use a Markdown template, set a price in CKB, review the article, and publish an encrypted offer. |
| **Explore** | Search and filter articles, then open a free preview. Expired and replaced local offers are hidden from Explore. |
| **Checkout** | Review the Fiber Testnet invoice, including price, routing fee limit, and expiry, before confirming payment. |
| **My Library** | Reopen unlocked articles or recover access by checking a payment already recorded in the same browser profile. |
| **Payments** | Follow guided startup and view the accounts’ connection status and capacity to send or receive. |

## Run locally

Use **Node.js 22.18+**, npm, and a current Chromium browser. From the repository root:

```sh
npm install
npm run dev
```

Open [localhost:3001](http://localhost:3001) and select **Get started with the demo**. The guide prepares two local accounts, **Reading** and **Publishing**. Use the linked faucet if either needs Testnet CKB, then confirm channel opening when prompted. Each new channel requires 500 Testnet CKB plus an on-chain fee. Wait for **Payments ready** before publishing or buying.

Use localhost or HTTPS so the browser can run the Fiber WebAssembly runtime. The app sets the required cross-origin isolation headers.

## Try the full flow

1. Open **Seller Studio → Start writing**. Write an article or choose a template, set a price, and select **Review article → Publish article**.
2. On **Encrypted offer published**, select **View as reader**. Read the free preview and confirm the full story is locked.
3. Select **Unlock**, review the invoice, and confirm payment. Once Fiber reports success, UNSEAL uses the key revealed by that payment to decrypt and display the article.
4. Open **My Library** to find the article again. If a payment is still pending, use **Check payment status** to look up the existing attempt.

## Architecture

```text
Reading node ── Fiber Testnet payment via Bottle ──► Publishing node
     │                                                 │
     └─ Verified payment reveals the decryption key    └─ Creates an encrypted offer
```

- **Browser:** Next.js renders the interface, and `@fiber-pay/sdk` runs the two local Fiber nodes. Browser storage keeps their identities, the local catalog, and payment attempts so the app can reconnect the saved accounts and recover purchases after a reload.
- **Publish and unlock:** The Publishing account encrypts the premium text with AES-256-GCM and creates an invoice tied to the encryption key. The Reading account validates the invoice, records the payment attempt, and decrypts the text after receiving the key from a successful payment.
- **Optional shared catalog:** A server API shares public metadata and previews between browsers. The demo’s paid checkout uses the local offers on the browser that published them.

<details>
<summary>Enable the optional shared preview catalog</summary>

Set `CATALOG_PUBLISH_TOKEN` in `.env.local` to a random secret of at least 32 characters and restart the server. After publishing an article, open **Share preview in Explore** and enter the token. Use HTTPS when accessing the app remotely.

`GET /api/articles` lists shared previews, and `GET /api/articles/:id` reads one. `POST /api/articles` requires the publishing token. The server stores public listings in `.catalog-data/` by default. Set `CATALOG_DATA_DIR` to a persistent writable directory for a single-server deployment.

</details>

## Troubleshooting

- **Setup is still waiting:** Faucet transfers and channel confirmations can take a few minutes.
- **Payment is still pending:** Check the existing payment from the article or My Library.
- **The app is open in another tab:** Close the other tab before reconnecting. Keep browser data for the profile that owns your funded channels.

## Development checks

```sh
npm run typecheck
npm test
npm run build
```
