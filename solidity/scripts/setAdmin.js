import * as dotenv from "dotenv";
dotenv.config();

import hre from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xB22680671f6b2dFDd83b41229cb87C14e9de7754";
  const ADMIN_ADDRESS = "0x7c092b4064606FC72D08Ac34146d71a04B39ca7b";

  const { ethers } = await hre.network.connect();

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Using account:", await signer.getAddress());

  const contract = await ethers.getContractAt(
    "BitPlace",
    CONTRACT_ADDRESS,
    signer,
  );

  console.log("Setting admin...");

  const tx = await contract.setAdminPainter(ADMIN_ADDRESS, true);
  console.log("Tx sent:", tx.hash);

  await tx.wait();

  console.log("Admin set successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// run command in solidity directory: npx hardhat run scripts/setAdmin.js --network arbitrumSepolia
