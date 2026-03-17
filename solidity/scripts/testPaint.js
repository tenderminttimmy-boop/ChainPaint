import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const bitPlace = await ethers.getContractAt("BitPlace", contractAddress);

  const x = 10;
  const y = 20;
  const color = 0xff0000;

  console.log("Painting pixel...");
  const tx = await bitPlace.paint(x, y, color, {
    value: 0,
  });

  await tx.wait();

  console.log("Paint transaction confirmed.");

  const storedValue = await bitPlace.getPixel(x, y);

  console.log("Stored pixel value:", storedValue.toString());
  console.log("Expected stored value:", (color + 1).toString());
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
