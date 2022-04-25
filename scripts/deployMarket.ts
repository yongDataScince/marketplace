import { ethers } from "hardhat";

async function main() {
  // string memory name_, string memory symbol_, string memory baseUri_
  const Market = await ethers.getContractFactory("MarketPlace");

  const market = await Market.deploy(
    "0xEf2dBc86954eA6338e53aE233917716F667E4f58",
    "0xac0186d44846f154DaC7b6141F7ACe92baAE32e4"
  );

  await market.deployed();

  console.log("Marketplace contract deployed to:", market.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// rinkeby - 0x35567EC7a7342d3088ef01a20587b419ee57aE32