type AppConfig = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  contractAddress: string;
};

const configs: Record<string, AppConfig> = {
  hardhat: {
    chainId: 31337,
    chainName: "Hardhat",
    rpcUrl: "http://127.0.0.1:8545",
    contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  },

  arbitrumSepolia: {
    chainId: 421614,
    chainName: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    contractAddress: "REPLACE_ME",
  },

  arbitrum: {
    chainId: 42161,
    chainName: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    contractAddress: "REPLACE_ME",
  },
};

// Change this to switch between configs (e.g. "hardhat", "arbitrumSepolia", "arbitrum")
const ENV = "hardhat";

export const APP_CONFIG = configs[ENV];
