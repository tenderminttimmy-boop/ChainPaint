import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const paidPaintFeeWei = ethers.parseEther("0.0002");
  const feeRecipient = "0x7c092b4064606FC72D08Ac34146d71a04B39ca7b";
  const minLotteryPayoutWei = ethers.parseEther("0.0005");
  const lotteryWinBps = 350; // 3.5% chance to win

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
