import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

require("@nomiclabs/hardhat-ethers");
require("./tasks/mint.ts");
require("./tasks/listItem.ts");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.5.7",
      },
      {
        version: "0.8.0",
      },
      {
        version: "0.8.1",
      },
      {
        version: "0.6.12",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      gas: 2100000,
      gasPrice: 8000000000,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      rinkeby: process.env.ETHERSCAN_API_KEY,
    },
  },
};

export default config;
