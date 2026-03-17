import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, mainnet, hardhat } from "wagmi/chains";
import { http } from "wagmi";

export const walletConfig = getDefaultConfig({
  appName: "BitPlace",
  projectId: "0c3f7a704b9805f869756e3dd7d20679",
  chains: [arbitrum, mainnet, hardhat],
  transports: {
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
    [hardhat.id]: http(),
  },
});
