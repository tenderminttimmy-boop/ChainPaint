import assert from "node:assert/strict";
import hre from "hardhat";

const FREE_PAINTS_PER_WINDOW = 10;

async function deployBitPlace(ethers, feeRecipient) {
  const paidPaintFeeWei = ethers.parseEther("0.0002");
  const minLotteryPayoutWei = 1n;
  const lotteryWinBps = 10_000;

  const bitPlace = await ethers.deployContract("BitPlace", [
    paidPaintFeeWei,
    feeRecipient,
    minLotteryPayoutWei,
    lotteryWinBps,
  ]);

  await bitPlace.waitForDeployment();

  return {
    bitPlace,
    paidPaintFeeWei,
  };
}

async function consumeFreePaints(bitPlace, count) {
  for (let i = 0; i < count; i++) {
    const tx = await bitPlace.paint(i, 0, 0x00ff00, { value: 0 });
    await tx.wait();
  }
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner, feeRecipient] = await ethers.getSigners();

  {
    const { bitPlace, paidPaintFeeWei } = await deployBitPlace(
      ethers,
      await feeRecipient.getAddress(),
    );

    await consumeFreePaints(bitPlace, FREE_PAINTS_PER_WINDOW);

    const tx = await bitPlace.paint(25, 0, 0xff0000, {
      value: paidPaintFeeWei,
    });
    const receipt = await tx.wait();

    const lotteryEvents = receipt.logs
      .map((log) => {
        try {
          return bitPlace.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((log) => log?.name === "LotteryWon");

    assert.equal(
      lotteryEvents.length,
      1,
      "11th single paint should trigger exactly one lottery run",
    );

    const [, paintsUsed] = await bitPlace.getCurrentWindow(
      await owner.getAddress(),
    );
    assert.equal(
      Number(paintsUsed),
      FREE_PAINTS_PER_WINDOW + 1,
      "single paid paint should increment the window count",
    );
  }

  {
    const { bitPlace, paidPaintFeeWei } = await deployBitPlace(
      ethers,
      await feeRecipient.getAddress(),
    );

    await consumeFreePaints(bitPlace, FREE_PAINTS_PER_WINDOW);

    const batchSize = 3;
    const tx = await bitPlace.paintBatch(
      [40, 41, 42],
      [0, 0, 0],
      [0xff0000, 0x00ff00, 0x0000ff],
      { value: paidPaintFeeWei * BigInt(batchSize) },
    );
    const receipt = await tx.wait();

    const parsedLogs = receipt.logs
      .map((log) => {
        try {
          return bitPlace.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const lotteryEvents = parsedLogs.filter((log) => log.name === "LotteryWon");
    const paidEvents = parsedLogs.filter((log) => log.name === "PaidPaint");

    assert.equal(
      lotteryEvents.length,
      1,
      "a paid batch starting on paint #11 should trigger exactly one lottery run",
    );
    assert.equal(
      paidEvents.length,
      1,
      "a paid batch should emit one PaidPaint event",
    );
    assert.equal(
      paidEvents[0].args.amount,
      paidPaintFeeWei * BigInt(batchSize),
      "the batch should charge the full paid batch fee",
    );

    const [, paintsUsed] = await bitPlace.getCurrentWindow(
      await owner.getAddress(),
    );
    assert.equal(
      Number(paintsUsed),
      FREE_PAINTS_PER_WINDOW + batchSize,
      "paid batch should increment the window count by the batch size",
    );
  }

  console.log(
    "Lottery boundary assertions passed for both single and paid-batch 11th-paint cases.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
