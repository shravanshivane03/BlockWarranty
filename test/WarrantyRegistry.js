const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WarrantyRegistry", function () {
  async function deployFixture() {
    const [admin, customer, buyer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("WarrantyRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, admin, customer, buyer };
  }

  it("sets the deploying wallet as administrator", async function () {
    const { registry, admin } = await deployFixture();
    expect(await registry.administrator()).to.equal(admin.address);
  });

  it("allows admin to register a warranty for a customer", async function () {
    const { registry, admin, customer } = await deployFixture();
    const purchase = Math.floor(Date.now() / 1000) - 86400;
    await registry.connect(admin).registerWarranty(
      "Laptop", "SER-001", "Customer One", customer.address,
      "Mumbai, India", purchase, 24
    );
    const w = await registry.getWarranty(1);
    expect(w.owner).to.equal(customer.address);
    expect(w.productName).to.equal("Laptop");
    expect(w.warrantyMonths).to.equal(24);
  });

  it("allows only the owner to transfer", async function () {
    const { registry, admin, customer, buyer } = await deployFixture();
    const purchase = Math.floor(Date.now() / 1000) - 86400;
    await registry.connect(admin).registerWarranty("Laptop", "SER-001", "Customer One", customer.address, "Mumbai", purchase, 24);
    await expect(registry.connect(buyer).transferWarranty(1, buyer.address, "Buyer", "Pune"))
      .to.be.revertedWith("Only warranty owner can perform this action");
    await registry.connect(customer).transferWarranty(1, buyer.address, "Buyer", "Pune");
    expect((await registry.getWarranty(1)).owner).to.equal(buyer.address);
  });

  it("supports claims, extensions, service records and voiding", async function () {
    const { registry, admin, customer } = await deployFixture();
    const purchase = Math.floor(Date.now() / 1000) - 86400;
    await registry.connect(admin).registerWarranty("Laptop", "SER-001", "Customer One", customer.address, "Mumbai", purchase, 24);
    await registry.connect(customer).submitClaim(1, "Display issue", "Flickering panel");
    expect((await registry.getClaims(1)).length).to.equal(1);
    await registry.connect(admin).updateClaimStatus(1, 1, 1, "Approved");
    await registry.connect(admin).addServiceRecord(1, "ABC Service", "Display fault", "Replaced panel", purchase);
    await registry.connect(admin).extendWarranty(1, 6, "Goodwill extension");
    expect((await registry.getWarranty(1)).extensionMonths).to.equal(6);
    await registry.connect(admin).voidWarranty(1, "Unauthorized repair");
    expect((await registry.getWarranty(1)).voided).to.equal(true);
  });
});
