import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, arbitrumSepolia, hardhat } from "wagmi/chains";
import { http } from "wagmi";
import { APP_CONFIG } from "./config";

function getChainFromConfig() {
  switch (APP_CONFIG.chainId) {
    case 31337:
      return hardhat;
    case 421614:
      return arbitrumSepolia;
    case 42161:
      return arbitrum;
    default:
      return hardhat;
  }
}

export const walletConfig = getDefaultConfig({
  appName: "BitPlace",
  projectId: "0c3f7a704b9805f869756e3dd7d20679",
  chains: [getChainFromConfig()],
  transports: {
    [APP_CONFIG.chainId]: http(APP_CONFIG.rpcUrl),
  },
});
