# BlockWarranty — Role-Based Blockchain E-Warranty dApp

A college-ready Ethereum-compatible decentralized warranty management prototype using **Solidity + Hardhat + Ganache + MetaMask + ethers.js**.

## What this version adds

1. **Separate Admin and Customer UI** — the connected wallet is compared with `administrator()` from the smart contract. The user cannot choose a role manually.
2. **Warranty lifecycle** — Registered → Active → Expiring Soon → Transferred → Claimed/Serviced → Extended, Expired or Voided.
3. **Warranty Claims** — customers submit claims; the administrator can approve, reject or complete them.
4. **Service History** — administrator can record diagnosis, service center, work performed and service date.
5. **Warranty Extension** — administrator can add warranty months with a reason.
6. **Automatic status** — frontend calculates Active, Expiring Soon, Expired or Voided from purchase date, original duration, extensions and current time.
7. **Product Dashboard** — admin sees all products; customers see only products currently owned by their wallet.
8. **Account Profiles** — name, email, phone and address are stored on-chain and displayed alongside wallet addresses.
9. **Human-readable ownership** — warranty verification shows owner name and wallet address.
10. **Blockchain Activity** — the UI reads smart-contract events directly from Ganache.
11. **Persistent Ganache workflow** — use a named Ganache workspace so the blockchain survives closing/reopening Ganache.

## Important project design

### Admin / Manufacturer

The wallet that deploys `WarrantyRegistry.sol` becomes the administrator.

Admin can:
- Register warranties for an initial customer wallet
- Void/cancel warranties
- Extend active warranties
- Review and update claims
- Add service history
- View all products and blockchain activity

### Customer

Any other connected wallet is treated as a customer.

Customer can:
- View products owned by the wallet
- Verify warranties
- Transfer warranties they own
- Submit warranty claims for active warranties
- View claim status
- View service history
- Manage their profile
- View blockchain activity

### Smart-contract enforcement

The UI is not the security boundary. Solidity also enforces permissions:

- `onlyAdministrator` protects registration, voiding, extensions, claim decisions and service records.
- `onlyOwner` protects warranty transfers and customer claim submission.
- Anyone can read warranty information.

## Warranty time model

For this academic prototype, **1 warranty month = 30 days**. This keeps the Solidity calculation deterministic and easy to explain in a viva. A production implementation should use calendar-aware date handling.

## Requirements

- Node.js 18+ recommended
- Ganache Desktop
- MetaMask browser extension
- Microsoft Edge/Chrome

## First-time setup

### 1. Create a persistent Ganache workspace

In Ganache Desktop:

1. Choose **New Workspace**.
2. Name it `BlockWarranty`.
3. Use port `7545`.
4. Keep the default test accounts.
5. Save the workspace.

Expected values:

```text
RPC:       http://127.0.0.1:7545
Network:   5777 (Ganache network ID)
Chain ID:  1337 (the chain ID used by Hardhat/MetaMask in this project)
```

Do **not** create a new Quickstart chain every time you open the project.

### 2. Install dependencies

From the project root:

```powershell
npm install
```

### 3. Compile

```powershell
npm run compile
```

### 4. Deploy ONCE to the persistent workspace

```powershell
npm run deploy
```

The deployment script automatically writes the deployed address and ABI into:

```text
frontend/contract-config.js
```

The terminal prints the contract address. Keep it for your project documentation.

### 5. Import the Ganache administrator account into MetaMask

In Ganache, open the key/private-key view for Account #1 and copy its private key.

In MetaMask use **Add account / Import account** and paste the Ganache test private key.

Never use or share a real wallet's private key. Ganache's local test keys are used only for this local academic project.

### 6. Add Ganache to MetaMask

Use:

```text
Network name:  Ganache Local
RPC URL:       http://127.0.0.1:7545
Chain ID:      1337
Currency:      ETH
```

The MetaMask network name is only a label. The RPC URL and chain ID are what connect the wallet to this local chain.

### 7. Start the frontend

```powershell
npm run serve
```

Open the localhost URL printed by the command.

## IMPORTANT: how to restart the project without starting from zero

After the first deployment, **do not run `npm run deploy` every time**.

### To close the project

You can close:
- Edge
- the frontend terminal
- Ganache
- MetaMask

### To open it again later

1. Open Ganache Desktop.
2. Open the existing **BlockWarranty** workspace.
3. Confirm the old blocks/transactions are still visible.
4. Confirm RPC is `http://127.0.0.1:7545`.
5. Open MetaMask and use the same imported Ganache account.
6. Open a terminal in the project folder.
7. Run only:

```powershell
npm run serve
```

8. Open the localhost URL.
9. Connect MetaMask.

**Do not run `npm run deploy` again.**

If you deploy again, you create a new contract instance. The old contract/data will still be on the chain, but the new deployment starts with empty warranty storage.

## Why the named Ganache workspace matters

Quickstart is convenient for temporary testing. For this project use the saved `BlockWarranty` workspace. The workspace preserves the local blockchain database so blocks, contract state and transactions remain available when Ganache is reopened.

## Admin account and roles

The administrator is always the account returned by:

```solidity
administrator()
```

The frontend compares the connected MetaMask address with that address.

Example:

```text
Account #1 → Administrator / Manufacturer
Account #2 → Customer
Account #3 → Customer
```

Do not change the Ganache administrator account after deployment if you want the same admin.

## Main user flows

### Admin registration

Admin opens **Dashboard → Register warranty** and enters:

- Product name
- Serial number
- Owner name
- Owner wallet address
- Purchase date
- Warranty duration
- Billing address

The warranty is registered directly to the supplied customer wallet.

### Customer transfer

The current owner enters:

- Product ID
- New owner name
- New owner wallet
- New billing address

Only the current owner can execute the transfer.

### Warranty claim

Customer opens **Claims → New claim**, selects an active product and enters the issue and description.

Admin then opens **Claims** and can:

- Approve
- Reject
- Complete

The status change is recorded on-chain.

### Service history

Admin opens **Service History → Add service record** and records:

- Product
- Service date
- Service center
- Diagnosis
- Work performed

The record becomes part of the product's blockchain-backed lifecycle.

### Warranty extension

Admin opens **Warranties / Dashboard → Extend warranty** and supplies:

- Product ID
- Additional months
- Reason

The expiration date automatically moves forward.

### Warranty voiding

Admin opens **Void warranty**, selects the product and enters a reason. The smart contract marks it permanently voided.

## Automatic status rules

The frontend calculates:

```text
VOIDED        → administrator voided it
EXPIRED       → current time is after expiration
EXPIRING SOON → 30 days or fewer remain
ACTIVE        → otherwise
```

Expiration is:

```text
purchase date + (original months + extension months) × 30 days
```

## Project structure

```text
contracts/
  WarrantyRegistry.sol

scripts/
  deploy.js

test/
  WarrantyRegistry.js

frontend/
  index.html
  style.css
  app.js
  contract-config.js

docs/
  PROJECT_NOTES.md
  DEMO_SCRIPT.md
```

## Commands

```powershell
npm install
npm run compile
npm test
npm run deploy
npm run serve
```

Use `npm run deploy` only for an intentional new contract deployment.

## If you change the Solidity contract

After changing `contracts/WarrantyRegistry.sol`:

```powershell
npm run compile
npm test
npm run deploy
```

The new deployment will have a new contract address and empty warranty state. Keep the old contract address in your documentation if you need its old data.

## Troubleshooting

### Website says contract not configured

Run:

```powershell
npm run deploy
```

Only do this when you intentionally want a new deployment.

### Wrong network

MetaMask must use:

```text
http://127.0.0.1:7545
Chain ID 1337
```

### Balance is 0

Check that MetaMask imported the exact Ganache account address and that the wallet is connected to the Ganache RPC. Never use Ethereum Mainnet for this project.

### Existing products disappeared

Most likely you deployed a new contract or opened a different Ganache chain. Reopen the saved `BlockWarranty` workspace and check the contract address in `frontend/contract-config.js`.

### Ganache was closed

That is fine when using the saved workspace. Reopen **BlockWarranty**; do not create a new Quickstart chain.

## Academic disclaimer

This is a local educational prototype. It uses Ganache test ETH and should not be treated as production warranty infrastructure. Real systems would require stronger identity, privacy, document storage, access control, auditing, calendar-aware warranty calculations and production blockchain infrastructure.
