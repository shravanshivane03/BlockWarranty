const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const WarrantyRegistry = await hre.ethers.getContractFactory("WarrantyRegistry");
  const registry = await WarrantyRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`WarrantyRegistry deployed to: ${address}`);

  const artifact = await hre.artifacts.readArtifact("WarrantyRegistry");
  const frontendDir = path.join(__dirname, "..", "frontend");
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.writeFileSync(
    path.join(frontendDir, "contract-config.js"),
    `window.WARRANTY_CONTRACT_ADDRESS = "${address}";\nwindow.WARRANTY_CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`
  );
  console.log("Updated frontend/contract-config.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
