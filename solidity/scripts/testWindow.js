import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bitPlace = await ethers.getContractAt("BitPlace", contractAddress);

  const paidPaintFeeWei = await bitPlace.paidPaintFeeWei();

  console.log("Paid paint fee (wei):", paidPaintFeeWei.toString());

  // We will paint 10 different pixels for free
  for (let i = 0; i < 10; i++) {
    const x = i;
    const y = 0;
    const color = 0x00ff00; // green

    console.log(`Sending free paint #${i + 1} at (${x}, ${y})...`);

    const tx = await bitPlace.paint(x, y, color, {
      value: 0,
    });

    await tx.wait();
    console.log(`Free paint #${i + 1} confirmed.`);
  }

  const [windowStart, paintsUsedInWindow] = await bitPlace.getCurrentWindow(
    await (await ethers.provider.getSigner()).getAddress(),
  );

  console.log("Window start:", windowStart.toString());
  console.log("Paints used after 10 paints:", paintsUsedInWindow.toString());

  // Try paint #11 with NO ETH: should fail
  try {
    console.log("Attempting paint #11 with no ETH (should fail)...");
    const tx = await bitPlace.paint(10, 0, 0x0000ff, {
      value: 0,
    });
    await tx.wait();

    console.log("ERROR: paint #11 unexpectedly succeeded with no ETH.");
  } catch (error) {
    console.log("Paint #11 correctly failed with no ETH.");
  }

  // Now try paint #11 again with the exact required ETH: should succeed
  console.log("Attempting paint #11 with exact ETH fee...");
  const paidTx = await bitPlace.paint(10, 0, 0x0000ff, {
    value: paidPaintFeeWei,
  });

  await paidTx.wait();
  console.log("Paint #11 succeeded with exact ETH fee.");

  const [, finalPaintsUsedInWindow] = await bitPlace.getCurrentWindow(
    await (await ethers.provider.getSigner()).getAddress(),
  );

  console.log(
    "Paints used after successful paid paint:",
    finalPaintsUsedInWindow.toString(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
