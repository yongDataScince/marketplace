import { ethers } from "hardhat";

async function main() {
  // string memory name_, string memory symbol_, string memory baseUri_
  const NFT = await ethers.getContractFactory("NFT721");
  const nft = await NFT.deploy("Custom NFT", "CKN", "ipfs://");

  await nft.deployed();

  console.log("NFT contract deployed to:", nft.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
