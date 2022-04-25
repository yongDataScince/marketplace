/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  MarketPlace,
  MarketPlace__factory,
  NFT721,
  NFT721__factory,
} from "../typechain";
import { TicketToken__factory } from "../typechain/factories/TicketToken__factory";
import { TicketToken } from "../typechain/TicketToken";

// ERC20(localhost) - 0x5FbDB2315678afecb367f032d93F642f64180aa3
// ERC721(localhost) - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

describe("Marketplace", function () {
  let Market: MarketPlace;
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress;
  let NFT: NFT721;
  let token: TicketToken;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    NFT = await new NFT721__factory(owner).deploy(
      "Market Token",
      "MTK",
      "ipfs://"
    );
    token = await new TicketToken__factory(owner).deploy("tiket", "TKT", 1000);

    Market = await new MarketPlace__factory(owner).deploy(
      NFT.address,
      token.address
    );

    await NFT.createMinter(Market.address);
    await token.mint(owner.address, ethers.utils.parseEther("1000"));
    await token.mint(addr1.address, ethers.utils.parseEther("1000"));
    await token.mint(addr2.address, ethers.utils.parseEther("1000"));
  });

  it("Creating item", async () => {
    await Market.createItem("tokenuri_1", addr1.address);
    await Market.createItem("tokenuri_2", addr2.address);
    await Market.createItem("tokenuri_3", owner.address);

    expect(await NFT.ownerOf(0)).to.equal(addr1.address);
    expect(await NFT.ownerOf(1)).to.equal(addr2.address);
    expect(await NFT.ownerOf(2)).to.equal(owner.address);
  });

  it("List Item", async () => {
    await Market.createItem("tokenuri_1", addr1.address);

    await NFT.connect(addr1).approve(Market.address, 0);

    await Market.connect(addr1).listItem(0, ethers.utils.parseEther("1"));

    expect(await NFT.ownerOf(0)).to.equal(Market.address);

    await expect(
      Market.connect(addr1).listItem(0, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("market: you not token owner or item already listed");

    await Market.createItem("tokenuri_2", addr2.address);

    await expect(
      Market.connect(addr1).listItem(1, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("market: you not token owner");

    await expect(
      Market.connect(addr2).listItem(1, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("market: you not approve token for marketplace");

    expect(await Market.getPrice(0)).to.equal(ethers.utils.parseEther("1"));
  });

  it("Cancel", async () => {
    await Market.createItem("canceled", owner.address);
    await NFT.approve(Market.address, 0);

    await Market.listItem(0, 1000);
    expect(await NFT.ownerOf(0)).to.equal(Market.address);

    await Market.cancel(0);
    expect(await NFT.ownerOf(0)).to.equal(owner.address);

    expect(await Market.getPrice(0)).to.equal(0);

    // Errors
    await expect(Market.cancel(0)).to.be.revertedWith(
      "market: item not listed"
    );

    await NFT.approve(Market.address, 0);
    await Market.listItem(0, 1000);

    await expect(Market.connect(addr1).cancel(0)).to.be.revertedWith(
      "market: you cant cancel this"
    );
  });

  it("Buy item", async () => {
    await Market.createItem("buy", owner.address);
    await NFT.approve(Market.address, 0);
    await Market.listItem(0, ethers.utils.parseEther("50"));
    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("50"));
    await Market.connect(addr1).buyItem(0);

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("1050")
    );

    expect(await token.balanceOf(addr1.address)).to.equal(
      ethers.utils.parseEther("950")
    );

    expect(await Market.getPrice(0)).to.equal(0);

    // Errors
    await expect(Market.buyItem(10)).to.be.revertedWith(
      "market: item not minted"
    );

    await expect(Market.buyItem(0)).to.be.revertedWith(
      "market: item not listed"
    );

    await Market.createItem("buy2", addr1.address);
    await NFT.connect(addr1).approve(Market.address, 1);
    await Market.connect(addr1).listItem(1, ethers.utils.parseEther("1100"));
    await expect(Market.buyItem(1)).to.be.revertedWith(
      "market: not enought tokens"
    );
    await expect(Market.connect(addr1).buyItem(1)).to.be.revertedWith(
      "market: you are owner"
    );

    await Market.createItem("buy3", addr1.address);
    await NFT.connect(addr1).approve(Market.address, 2);
    await Market.connect(addr1).listItem(2, ethers.utils.parseEther("100"));
    await expect(Market.buyItem(2)).to.be.revertedWith(
      "market: approve token for marketplace"
    );
  });

  it("List item on auction", async () => {
    await Market.createItem("auc", owner.address);
    await NFT.approve(Market.address, 0);
    await Market.listItemOnAuction(0, ethers.utils.parseEther("0.01"));

    expect(await NFT.ownerOf(0)).to.equal(Market.address);
    expect(await Market.getCurrentPrice(0)).to.equal(
      ethers.utils.parseEther("0.01")
    );

    // Errors
    await expect(
      Market.listItemOnAuction(0, ethers.utils.parseEther("0.01"))
    ).to.be.revertedWith("market auction: tokent alreadt listed on auction");

    await Market.createItem("auc", owner.address);
    await expect(
      Market.connect(addr1).listItemOnAuction(
        1,
        ethers.utils.parseEther("0.01")
      )
    ).to.be.revertedWith("market: you not token owner");

    await expect(
      Market.listItemOnAuction(1, ethers.utils.parseEther("0.01"))
    ).to.be.revertedWith("market: you not approve token for marketplace");
  });

  it("Make Bid", async () => {
    const surcharge = ethers.utils.parseEther("0.15");
    const surcharge2 = ethers.utils.parseEther("0.55");

    await Market.createItem("auc", addr1.address);
    await NFT.connect(addr1).approve(Market.address, 0);
    await Market.connect(addr1).listItemOnAuction(
      0,
      ethers.utils.parseEther("0.1")
    );
    await token.approve(Market.address, ethers.utils.parseEther("0.8"));

    await Market.makeBid(0, surcharge);
    expect(await token.balanceOf(Market.address)).to.equal(surcharge);
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther(String(1000 - 0.15))
    );

    await token
      .connect(addr2)
      .approve(Market.address, ethers.utils.parseEther("0.8"));
    await Market.connect(addr2).makeBid(0, surcharge2);
    expect(await token.balanceOf(Market.address)).to.equal(surcharge2);
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("1000")
    );
    expect(await token.balanceOf(addr2.address)).to.equal(
      ethers.utils.parseEther(String(1000 - 0.55))
    );

    // Errors
    await expect(
      Market.connect(addr2).makeBid(10, surcharge2)
    ).to.be.revertedWith("market: item not minted");

    await Market.createItem("auc2", addr1.address);
    await NFT.connect(addr1).approve(Market.address, 1);

    await expect(
      Market.connect(addr2).makeBid(1, surcharge2)
    ).to.be.revertedWith("market auction: item not listed");

    await Market.connect(addr1).listItemOnAuction(
      1,
      ethers.utils.parseEther("0.1")
    );
    await expect(
      Market.connect(addr2).makeBid(1, ethers.utils.parseEther("1500"))
    ).to.be.revertedWith("market auction: not enought tokens");

    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("80"));

    await expect(
      Market.connect(addr1).makeBid(1, ethers.utils.parseEther("10"))
    ).to.be.revertedWith("market auction: owner cant make bid");

    await Market.createItem("auc3", addr1.address);
    await NFT.connect(addr1).approve(Market.address, 2);
    await Market.connect(addr1).listItemOnAuction(
      2,
      ethers.utils.parseEther("1")
    );
    await token.approve(Market.address, ethers.utils.parseEther("0.8"));

    await expect(
      Market.makeBid(2, ethers.utils.parseEther("0.8"))
    ).to.be.revertedWith("market auction: new price must be more old");
  });

  it("Finish auction", async () => {
    await Market.createItem("auc", owner.address);

    await NFT.approve(Market.address, 0);
    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("15"));

    await Market.listItemOnAuction(0, ethers.utils.parseEther("5"));
    await Market.connect(addr1).makeBid(0, ethers.utils.parseEther("15"));
    await Market.finishAuction(0);

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("1015")
    );

    expect(await token.balanceOf(addr1.address)).to.equal(
      ethers.utils.parseEther("985")
    );

    expect(await NFT.ownerOf(0)).to.equal(addr1.address);

    await Market.createItem("auc2", owner.address);
    await NFT.approve(Market.address, 1);
    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("15"));
    await Market.listItemOnAuction(1, ethers.utils.parseEther("5"));
    expect(await NFT.ownerOf(1)).to.equal(Market.address);
    await Market.finishAuction(1);
    expect(await NFT.ownerOf(1)).to.equal(owner.address);

    // Error
    await Market.createItem("auc3", owner.address);
    await NFT.approve(Market.address, 2);
    await expect(Market.finishAuction(2)).to.be.revertedWith(
      "market auction: item not listed"
    );
  });

  it("Cancel auction", async () => {
    await Market.createItem("auc", owner.address);

    await NFT.approve(Market.address, 0);
    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("15"));

    await Market.listItemOnAuction(0, ethers.utils.parseEther("5"));
    await Market.connect(addr1).makeBid(0, ethers.utils.parseEther("15"));

    expect(await NFT.ownerOf(0)).to.equal(Market.address);
    expect(await token.balanceOf(addr1.address)).to.equal(
      ethers.utils.parseEther("985")
    );

    await Market.cancelAuction(0);

    expect(await token.balanceOf(addr1.address)).to.equal(
      ethers.utils.parseEther("1000")
    );
    expect(await NFT.ownerOf(0)).to.equal(owner.address);

    await Market.createItem("auc2", owner.address);
    await NFT.approve(Market.address, 1);
    await Market.listItemOnAuction(1, ethers.utils.parseEther("5"));
    expect(await NFT.ownerOf(1)).to.equal(Market.address);
    await Market.cancelAuction(1);
    expect(await NFT.ownerOf(1)).to.equal(owner.address);

    await Market.createItem("auc3", owner.address);
    await NFT.approve(Market.address, 2);

    await expect(Market.cancelAuction(2)).to.be.revertedWith(
      "market auction: item not listed"
    );
  });

  it("View functions", async () => {
    await Market.createItem("auc", owner.address);
    await Market.createItem("auc2", owner.address);
    await Market.createItem("auc3", owner.address);

    await NFT.approve(Market.address, 0);
    await NFT.approve(Market.address, 1);
    await NFT.approve(Market.address, 2);

    await token
      .connect(addr1)
      .approve(Market.address, ethers.utils.parseEther("10"));

    await token
      .connect(addr2)
      .approve(Market.address, ethers.utils.parseEther("10"));

    await Market.listItem(0, ethers.utils.parseEther("5"));

    expect(await Market.isListed(0)).to.equal(true);
    expect(await Market.isListed(1)).to.equal(false);

    await Market.listItemOnAuction(2, ethers.utils.parseEther("5"));
    await Market.connect(addr1).makeBid(2, ethers.utils.parseEther("7"));
    await Market.connect(addr2).makeBid(2, ethers.utils.parseEther("8"));

    expect(await Market.lastBider(2)).to.equal(addr2.address);
  });
});
