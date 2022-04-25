import { task } from "hardhat/config";
task("list-item")
  .addParam("tokenid")
  .addParam("price")
  .addParam("contractaddr")
  .setAction(
    async ({
      tokenid,
      price,
      contractaddr,
    }: {
      tokenid: number;
      price: number;
      contractaddr: string;
    }) => {
      const { ethers } = require("hardhat");

      const Market = await ethers.getContractFactory("MarketPlace");
      const market = await Market.attach(contractaddr);

      const NFT = await ethers.getContractFactory("NFT721");
      const nft = await NFT.attach(
        "0xac0186d44846f154DaC7b6141F7ACe92baAE32e4"
      );
      const listed = await market.isListed(tokenid);
      if (!listed) {
        await nft.approve(contractaddr, tokenid);

        await market.listItem(tokenid, ethers.utils.parseEther(String(price)));
        console.log("Item listed");
      } else {
        console.log("Item already listed");
      }
    }
  );
