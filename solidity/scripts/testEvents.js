import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bitPlace = await ethers.getContractAt("BitPlace", contractAddress);

  const paidPaintFeeWei = await bitPlace.paidPaintFeeWei();
  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("Using signer:", signerAddress);
  console.log("Contract:", contractAddress);
  console.log("Paid fee:", paidPaintFeeWei.toString());

  // 10 free paints
  for (let i = 0; i < 10; i++) {
    const tx = await bitPlace.paint(i, 99, 0x00ff00, { value: 0 });
    await tx.wait();
  }

  // 11th paint = first paid paint = lottery check
  const paidTx = await bitPlace.paint(10, 99, 0xff0000, {
    value: paidPaintFeeWei,
  });
  const receipt = await paidTx.wait();

  console.log("Paid tx hash:", receipt.hash);

  // Read logs from this tx only
  for (const log of receipt.logs) {
    try {
      const parsed = bitPlace.interface.parseLog(log);
      console.log(`Event: ${parsed.name}`);
      console.log(parsed.args);
    } catch {
      // Ignore logs from other contracts / unrecognized logs
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
