import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const paidPaintFeeWei = ethers.parseEther("0.0002");
  const feeRecipient = "0x0000000000000000000000000000000000000001";
  const minLotteryPayoutWei = ethers.parseEther("0.0005");
  const lotteryWinBps = 2000; // 20% for easy local testing

  const bitPlace = await ethers.deployContract("BitPlace", [
    paidPaintFeeWei,
    feeRecipient,
    minLotteryPayoutWei,
    lotteryWinBps,
  ]);

  await bitPlace.waitForDeployment();

  console.log("BitPlace deployed to:", await bitPlace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
