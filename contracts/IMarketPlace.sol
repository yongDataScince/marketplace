//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMarketPlace {
  function createItem(string memory _tokenURI, address _owner) external;

  function listItem(uint _tokenId, uint _price) external;

  function cancel(uint _tokenId) external;

  function buyItem(uint _tokenId) external;

  function listItemOnAuction(uint _tokenId, uint _minPrice) external;

  function makeBid(uint _tokenId, uint _price) external;

  function finishAuction(uint _tokenId) external;

  function cancelAuction(uint _tokenId) external;
}
