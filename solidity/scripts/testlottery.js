import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bitPlace = await ethers.getContractAt("BitPlace", contractAddress);

  const paidPaintFeeWei = await bitPlace.paidPaintFeeWei();
  const feeRecipient = await bitPlace.feeRecipient();
  const minLotteryPayoutWei = await bitPlace.minLotteryPayoutWei();
  const lotteryWinBps = await bitPlace.lotteryWinBps();

  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("Signer:", signerAddress);
  console.log("Fee recipient:", feeRecipient);
  console.log("Paid paint fee (wei):", paidPaintFeeWei.toString());
  console.log("Min lottery payout (wei):", minLotteryPayoutWei.toString());
  console.log("Lottery win bps:", lotteryWinBps.toString());

  const contractBalanceBefore =
    await ethers.provider.getBalance(contractAddress);
  const signerBalanceBefore = await ethers.provider.getBalance(signerAddress);
  const recipientBalanceBefore = await ethers.provider.getBalance(feeRecipient);

  console.log("Contract balance before:", contractBalanceBefore.toString());
  console.log("Signer balance before:", signerBalanceBefore.toString());
  console.log(
    "Fee recipient balance before:",
    recipientBalanceBefore.toString(),
  );

  // Do 10 free paints
  for (let i = 0; i < 10; i++) {
    const tx = await bitPlace.paint(i, 10, 0x00ff00, { value: 0 });
    await tx.wait();
    console.log(`Free paint #${i + 1} confirmed`);
  }

  // 11th paint = first paid paint, should trigger lottery check
  const paidTx = await bitPlace.paint(10, 10, 0xff0000, {
    value: paidPaintFeeWei,
  });
  const receipt = await paidTx.wait();

  console.log("Paid paint confirmed in tx:", receipt.hash);

  const contractBalanceAfter =
    await ethers.provider.getBalance(contractAddress);
  const signerBalanceAfter = await ethers.provider.getBalance(signerAddress);
  const recipientBalanceAfter = await ethers.provider.getBalance(feeRecipient);

  console.log("Contract balance after:", contractBalanceAfter.toString());
  console.log("Signer balance after:", signerBalanceAfter.toString());
  console.log("Fee recipient balance after:", recipientBalanceAfter.toString());

  console.log(
    "Contract balance change:",
    (contractBalanceAfter - contractBalanceBefore).toString(),
  );
  console.log(
    "Fee recipient balance change:",
    (recipientBalanceAfter - recipientBalanceBefore).toString(),
  );

  const [, paintsUsedInWindow] = await bitPlace.getCurrentWindow(signerAddress);
  console.log("Paints used in window:", paintsUsedInWindow.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
