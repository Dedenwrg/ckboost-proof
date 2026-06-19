# CKB Store Data on Cell - Quest Proofs

Proof of completion for the CKB **Store Data on Cell** tutorial running on a local OffCKB devnet. 

---

## 1. OffCKB Environment Setup

### CLI Installation
Verified `@offckb/cli` installation.
![OffCKB Install](OFFCKB-SETUP/offckb_install.png)

### Running Local Devnet
Started the local CKB node.
![Start OffCKB Node](OFFCKB-SETUP/start_offckb.png)

### Pre-funded Accounts
Checked the genesis accounts to extract the private key for the dApp.
![OffCKB Accounts](OFFCKB-SETUP/offckb_acc.png)

---

## 2. DApp Execution & Flow

### Start Frontend
Launched the local development server for the frontend application.
![Start DApp](STORE-DATA/start_dapp.png)

### Message Encode Preview
Inputting UTF-8 text and verifying the real-time Hex encoding preview before broadcasting.
![Encode and Decode](STORE-DATA/encode_decode.png)

### Transaction Building & Broadcast
Clicking **Write to Chain** compiles, signs, and broadcasts the transaction, dynamically showing the Transaction Hash.
![Building the Transaction](STORE-DATA/build_tx.png)

### Cell Data Retrieval & Decode
Querying the Live Cell data via RPC and decoding the raw Hex payload back to the original text message.
![Retrieving Live Cell Data](STORE-DATA/Retrieving.png)