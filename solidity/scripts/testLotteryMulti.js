import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bitPlace = await ethers.getContractAt("BitPlace", contractAddress);

  const paidPaintFeeWei = await bitPlace.paidPaintFeeWei();
  const feeRecipient = await bitPlace.feeRecipient();
  const minLotteryPayoutWei = await bitPlace.minLotteryPayoutWei();
  const lotteryWinBps = await bitPlace.lotteryWinBps();

  const signers = await ethers.getSigners();

  console.log("Fee recipient:", feeRecipient);
  console.log("Paid paint fee (wei):", paidPaintFeeWei.toString());
  console.log("Min lottery payout (wei):", minLotteryPayoutWei.toString());
  console.log("Lottery win bps:", lotteryWinBps.toString());

  const contractBalanceBefore =
    await ethers.provider.getBalance(contractAddress);
  const recipientBalanceBefore = await ethers.provider.getBalance(feeRecipient);

  console.log("Contract balance before:", contractBalanceBefore.toString());
  console.log(
    "Fee recipient balance before:",
    recipientBalanceBefore.toString(),
  );

  // Use a few different local accounts
  for (let s = 0; s < 20; s++) {
    const signer = signers[s];
    const signerAddress = await signer.getAddress();
    const connectedBitPlace = bitPlace.connect(signer);

    console.log(`\n--- Signer ${s} (${signerAddress}) ---`);

    // 10 free paints
    for (let i = 0; i < 10; i++) {
      const x = s * 10 + i;
      const y = 50;

      const tx = await connectedBitPlace.paint(x, y, 0x00ff00, { value: 0 });
      await tx.wait();

      console.log(`Free paint #${i + 1} confirmed at (${x}, ${y})`);
    }

    // 11th paint = first paid paint = lottery check
    const paidX = s * 10 + 10;
    const paidY = 50;

    const signerBalanceBefore = await ethers.provider.getBalance(signerAddress);

    const paidTx = await connectedBitPlace.paint(paidX, paidY, 0xff0000, {
      value: paidPaintFeeWei,
    });
    await paidTx.wait();

    const signerBalanceAfter = await ethers.provider.getBalance(signerAddress);
    const contractBalanceNow =
      await ethers.provider.getBalance(contractAddress);
    const recipientBalanceNow = await ethers.provider.getBalance(feeRecipient);
    const signerBalanceDelta = signerBalanceAfter - signerBalanceBefore;

    if (signerBalanceDelta > 0) {
      console.log("---------WINNER! Lottery payout happened!---------");
    }
    console.log(`Paid paint confirmed at (${paidX}, ${paidY})`);
    console.log("Signer balance after:", signerBalanceAfter.toString());
    console.log("Contract balance now:", contractBalanceNow.toString());
    console.log("Fee recipient balance now:", recipientBalanceNow.toString());

    const [, paintsUsedInWindow] =
      await bitPlace.getCurrentWindow(signerAddress);
    console.log("Paints used in signer window:", paintsUsedInWindow.toString());

    // This delta includes gas, so it won't cleanly prove a lottery win by itself,
    // but it is still useful context.
    console.log("Signer balance delta:", signerBalanceDelta.toString());
  }

  const contractBalanceAfter =
    await ethers.provider.getBalance(contractAddress);
  const recipientBalanceAfter = await ethers.provider.getBalance(feeRecipient);

  console.log("\n=== Final Balances ===");
  console.log("Contract balance after:", contractBalanceAfter.toString());
  console.log("Fee recipient balance after:", recipientBalanceAfter.toString());
  console.log(
    "Contract balance change:",
    (contractBalanceAfter - contractBalanceBefore).toString(),
  );
  console.log(
    "Fee recipient balance change:",
    (recipientBalanceAfter - recipientBalanceBefore).toString(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
