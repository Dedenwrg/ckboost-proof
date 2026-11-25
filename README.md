# UNSEAL

UNSEAL is a publishing demo for **Fiber Quest 2 (Advanced)**. A writer publishes an article with a free preview and an encrypted full story. A reader pays a Fiber Testnet invoice, and the payment reveals the key that unlocks the article in their browser.

**[Open the live demo](https://fiber-demo.adanothe.com/)** · [Walk through the demo](#demo-walkthrough) · [Run locally](#run-locally)

<!-- Add the Quest 2 screen-recording link here before submission. -->

## Demo walkthrough

The hosted demo and local app support the same workflow. Use one browser tab for the full demo so the Reading and Publishing accounts stay together.

1. **Prepare the two accounts.** On Home, select **Get started with the demo**. Use the faucet for each account that needs funds, then confirm channel opening when prompted. Each new channel requires 500 Testnet CKB plus an on-chain fee. Wait for **Payments ready**.
2. **Publish an article.** Open **Seller Studio → Start writing**. Write your own article or choose a Markdown template, set a price, and select **Review article → Publish article**. The **Encrypted offer published** screen shows the offer details.
3. **Open the buyer view.** Select **View as reader** to see the free preview and the locked story. Select **Unlock**, review the invoice and the maximum fee, then confirm the payment.
4. **Read the result.** The full story appears when payment succeeds and decryption completes. Open **My Library** to find it again.

## What changed from the starter

The [encrypted data payment starter](https://www.fiber.world/docs/build/encrypted-data-payment) demonstrates the payment and decryption exchange. UNSEAL adapts it into an article marketplace, taking the seller from draft to encrypted offer and the buyer from preview to unlocked article through the UI.

| Feature | What it adds |
| --- | --- |
| **Seller Studio** | Editable Markdown templates, a free preview and premium body, custom CKB prices, and an offer summary after publishing. |
| **Explore** | Search and category filters for discovering articles. Expired and replaced local offers are hidden from the list. |
| **Checkout** | A readable invoice summary with article price, maximum routing fee, maximum total, and expiry when available. |
| **My Library** | A place to reopen paid stories or recover a recorded payment after reloading the same browser profile. |
| **Payments** | Guided Testnet setup and a status page for channel readiness and the capacity to send or receive. |

## Architecture and payment flow

Next.js serves the interface and the optional shared catalog API. The two Fiber nodes run in the browser through `@fiber-pay/sdk`. **Reading** sends payments, **Publishing** creates invoices and receives payments, and **Bottle** routes payments between their channels on Testnet.

### How payment unlocks an article

1. **Encrypt the premium text.** When the writer publishes, UNSEAL generates a key and encrypts the full story with AES-256-GCM. The title and free preview remain readable.
2. **Create the offer.** The Publishing node creates a Fiber Testnet invoice at the writer’s chosen price. The encryption key is used as the invoice’s payment preimage. UNSEAL saves the invoice and encrypted story in the local offer.
3. **Validate before checkout.** The Reading node checks the invoice network, amount, and payment hash against the offer. The reader sees the price and fee limit before confirming.
4. **Record and send.** UNSEAL saves the attempt before sending the payment through Bottle. A pending or uncertain attempt can be checked using its existing payment record.
5. **Decrypt after confirmation.** Once Fiber reports success and returns the preimage, UNSEAL uses it as the decryption key. The full story replaces the locked preview.
6. **Recover access later.** After a reload, UNSEAL reconnects the saved accounts. **My Library** can reopen the article and recover the key from the settled payment. Invoice expiry closes new checkout while existing settled access remains recoverable.

### Where the data lives

| Location | Data |
| --- | --- |
| **Browser profile** | Saved node identities, local offers, and payment attempts. |
| **Shared catalog server** | Public titles, author names, categories, previews, and listed prices for articles shared by a seller. |

The shared catalog lets a second browser discover and read a preview. The paid demo uses a local offer in the browser profile where it was published.

<details>
<summary>Configure the optional shared catalog</summary>

Set `CATALOG_PUBLISH_TOKEN` in `.env.local` to a random secret of at least 32 characters and restart the server. After publishing, select **Share preview in Explore** and enter the token. Use HTTPS for remote access.

`GET /api/articles` lists public previews and `GET /api/articles/:id` fetches one. `POST /api/articles` shares a preview with the configured bearer token.

Listings are saved in `.catalog-data/` by default. For a single-server deployment, set `CATALOG_DATA_DIR` to a persistent writable directory.

</details>

## Run locally

Use **Node.js 22.18+**, npm, and a current Chromium browser. From the project root, run:

```sh
npm ci
npm run dev
```

Open [localhost:3001](http://localhost:3001) and follow the [demo walkthrough](#demo-walkthrough). The Fiber browser runtime requires a secure context and cross-origin isolation. Use localhost or HTTPS. The required headers are configured in [next.config.mjs](next.config.mjs).

For a production-mode check, run `npm run build` followed by `npm start` and open the URL printed by Next.js. Run `npm run typecheck` and `npm test` for the development checks.

## Troubleshooting

- **Setup is waiting.** Faucet transfers and channel opening can take a few minutes. Return to the setup tab so it can update the account balances.
- **Payment is still pending.** From the article, select **Check payment status** to look up the same attempt.
- **The app is open in another tab.** Close the other tab and reconnect. Keep the browser data for the profile that owns your funded channels.
- **The deployed app can’t start the node.** Check HTTPS and confirm the proxy preserves the cross-origin isolation headers from the Next.js configuration.
