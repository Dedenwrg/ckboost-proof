# Build on CKB: Campaign #03

Get started on CKB by completing a tutorial (Build a Simple Lock) and sharing an interesting reflection!

---

## 1. OffCKB Environment Setup

> **Note:** The OffCKB environment setup (CLI installation, starting the local devnet, and checking accounts) was already completed in campaign-02. The screenshots in this section are reused from `campaign-02` because the setup process is identical and already running.

### CLI Installation

Verified `@offckb/cli` installation.
![OffCKB Install](../campaign-02/OFFCKB-SETUP/offckb_install.png)

### Running Local Devnet

Started the local CKB node.
![Start OffCKB Node](../campaign-02/OFFCKB-SETUP/start_offckb.png)

### Pre-funded Accounts

Checked the genesis accounts to extract the private key for the dApp.
![OffCKB Accounts](../campaign-02/OFFCKB-SETUP/offckb_acc.png)

---

## 2. Build and Deploy the Script

### Build the Script

Compiled the contract using `pnpm install` and `pnpm build`.
![Build Script](./BUILD-DEPLOY/build-contract.png)

> **Issue Encountered & Debugging:**
> During the initial build, an error occurred because `ckb-debugger` was missing from the system. This dependency is not mentioned in the [official tutorial](https://docs.nervos.org/docs/dapp/simple-lock), but the build script relies on it to validate the compiled bytecode. To resolve this, I followed the [Debug with ckb-debugger](https://docs.nervos.org/docs/script/rust/rust-debug#debug-with-ckb-debugger) documentation to install it.

![Build Error](./BUILD-DEPLOY/build-error.png)


### Deploy the Script

Deployed the Script binary to the Devnet using `pnpm run deploy --network devnet`.
![Deploy Script](./BUILD-DEPLOY/deploy-contract.png)

---

## 3. DApp Execution & Flow

### Start Frontend

Launched the local development server for the frontend application and opened it in the browser.
![Start DApp](./DAPP/start-dapp.png)

### Deposit CKB

Deposited CKB into the `hash_lock` CKB address using the `offckb deposit` command to prepare Live Cells for the script.
![Deposit CKB](./DAPP/deposit-ckb.png)

### Build Transaction

Building the CKB transaction to prepare for transferring the balance.
![Build Transaction](./DAPP/build-tx.png)

### Transfer / Unlock Tokens

Transferred balance from the `hash_lock` address to another address by providing the correct preimage to unlock the tokens.
![Transfer Tokens](./DAPP/transfer-tx.png)
