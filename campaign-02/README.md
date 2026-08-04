# CKB Store Data on Cell - Quest Proofs

Proof of completion for the **Store Data on Cell** tutorial using a local OffCKB Devnet.

---

## 1. OffCKB Environment Setup

### CLI Installation

Verified that `@offckb/cli` was installed successfully.

![OffCKB Install](./OFFCKB-SETUP/offckb_install.png)

### Running Local Devnet

Started the local CKB Devnet.

![Start OffCKB Node](./OFFCKB-SETUP/start_offckb.png)

### Pre-funded Accounts

Listed the pre-funded genesis accounts and retrieved the private key required for testing the dApp.

![OffCKB Accounts](./OFFCKB-SETUP/offckb_acc.png)

---

## 2. DApp Execution & Flow

### Start Frontend

Started the frontend development server and opened the application in the browser.

![Start DApp](./STORE-DATA/start_dapp.png)

### Message Encoding Preview

Entered a UTF-8 message and verified the generated hexadecimal representation before submitting the transaction.

![Encode and Decode](./STORE-DATA/encode_decode.png)

### Build & Broadcast Transaction

Submitted the transaction by clicking **Write to Chain**, which built, signed, and broadcast the transaction. The generated transaction hash was displayed after submission.

![Building the Transaction](./STORE-DATA/build_tx.png)

### Retrieve & Decode Cell Data

Retrieved the stored Live Cell through the RPC interface and verified that the stored hexadecimal data could be decoded back into the original UTF-8 message.

![Retrieving Live Cell Data](./STORE-DATA/Retrieving.png)
