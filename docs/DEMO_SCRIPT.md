# BlockWarranty — 6–8 Minute Demo Script

## 1. Connect manufacturer/admin

Connect Ganache Account #1.

Show:

- `Ganache Local (Chain 1337)`
- administrator role
- contract address

Explain: "The deploying wallet is the manufacturer administrator. The frontend detects this from the smart contract's administrator address."

## 2. Register a warranty

Register a product for a customer wallet.

Show:
- owner name
- owner wallet
- purchase date
- warranty period
- billing address

Confirm the MetaMask transaction and show the new blockchain event.

## 3. Switch to customer

Switch MetaMask to Account #2.

Connect again.

Show the customer dashboard containing the newly assigned product.

## 4. Verify automatic status

Open the product and show:

- purchase date
- expiration date
- remaining days
- status
- owner name + wallet

Explain that the status is calculated automatically.

## 5. Submit warranty claim

Customer submits a claim.

Switch to admin.

Approve or reject the claim and show the blockchain activity event.

## 6. Add service history

Admin adds a service record:

- service center
- diagnosis
- work performed
- service date

Show it in the customer's Service History tab.

## 7. Extend warranty

Admin extends the warranty by six months.

Verify the expiration date and remaining days changed automatically.

## 8. Transfer ownership

Customer transfers the warranty to Account #3.

Switch to Account #3 and show the product now appears in that customer's dashboard.

## 9. Void warranty

Switch to admin.

Void a warranty with a realistic reason such as unauthorized repair.

Verify that the status becomes VOIDED and the reason is displayed.

## 10. Finish with blockchain activity

Open Blockchain Activity and show:

- registration event
- transfer event
- claim event
- service event
- extension event
- void event

Closing statement:

"The project demonstrates role-based smart-contract authorization, product ownership transfer and a complete warranty lifecycle with an auditable blockchain event history."
