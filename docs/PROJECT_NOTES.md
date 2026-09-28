# BlockWarranty — Project Notes

## Problem

Physical and centralized warranty records can be difficult to audit, transfer and verify across manufacturers, owners and service providers.

## Solution

BlockWarranty uses an Ethereum-compatible smart contract as a shared warranty ledger. Important warranty lifecycle actions become signed blockchain transactions and emit events that can be displayed as an audit trail.

## Core entities

- Product warranty
- Customer/owner wallet
- Customer profile
- Warranty claim
- Service record
- Warranty extension
- Blockchain event

## Roles

### Administrator / Manufacturer

The deploying wallet becomes `administrator`.

Can:
- register warranties
- void warranties
- extend active warranties
- update claim status
- add service records

### Customer

Any non-administrator wallet.

Can:
- view owned products
- transfer owned warranties
- submit claims for owned active warranties
- manage their profile
- view service history

## Why blockchain

The project uses blockchain for:

1. Ownership authorization based on wallet signatures.
2. Immutable event history for registration, transfer, void, extension, claims and service records.
3. Shared verification without trusting a frontend-only flag.
4. Smart-contract enforcement of role permissions.

## Warranty lifecycle

```text
REGISTERED
    ↓
ACTIVE
    ↓
EXPIRING SOON
    ↓
 ┌───────────────┬──────────────┐
 ↓               ↓              ↓
TRANSFER       CLAIM/SERVICE   EXPIRED
 ↓               ↓
ACTIVE           ACTIVE
                  ↓
               EXTENDED
                  ↓
                ACTIVE

Any active warranty can become VOIDED by the administrator.
```

## Viva explanation

**Why not store everything in a normal database?**

A normal database is still useful for a production application, but blockchain is valuable for the shared authorization and audit trail. The prototype demonstrates that critical state changes can be signed, recorded in blocks and enforced by smart-contract rules.

**Why are wallet addresses still shown?**

The wallet is the cryptographic identity used by Ethereum. Human-readable names are stored in profiles so users do not have to interpret raw hexadecimal addresses, while the address remains available for verification.

**Why is warranty status automatic?**

The contract stores purchase date, duration and extensions. The UI derives the current status from the current timestamp, so the user does not have to manually change `Active` to `Expired`.
