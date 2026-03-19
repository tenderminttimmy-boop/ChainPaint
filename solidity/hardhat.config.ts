import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      mining: {
        auto: false,
        interval: 10000,
      },
    },
  },
});
