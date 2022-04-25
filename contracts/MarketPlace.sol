//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./IMarketPlace.sol";
import "./CustomNFT.sol";
import "./IERC20.sol";

contract MarketPlace is IMarketPlace {
  NFT721 private _erc721;
  IERC20 private _token;

  mapping(uint => uint) private _tokensPrice;
  mapping(uint => uint) private _tokensAuctionPrice;
  mapping(uint => bool) private _listedTokens;
  mapping(uint => bool) private _listedTokensOnAuction;
  mapping(uint => address) private _tokenOwners;
  mapping(uint => address) private _lastBider;

  constructor(address _erc721Addr, address _erc20) {
    _erc721 = NFT721(_erc721Addr);
    _token = IERC20(_erc20);
  }

  function createItem(string memory _tokenURI, address _owner) override external {
    _erc721.mint(_owner, _tokenURI);
  }

  function listItem(uint _tokenId, uint _price) override external {
    require(msg.sender == _erc721.ownerOf(_tokenId), "market: you not token owner or item already listed");
    require(_erc721.getApproved(_tokenId) == address(this), "market: you not approve token for marketplace");
  
    _erc721.transferFrom(_erc721.ownerOf(_tokenId), address(this), _tokenId);
    _tokensPrice[_tokenId] = _price;
    _tokenOwners[_tokenId] = msg.sender;
    _listedTokens[_tokenId] = true;
  }

  function cancel(uint _tokenId) override external {
    require(_listedTokens[_tokenId], "market: item not listed");
    require(_tokenOwners[_tokenId] == msg.sender, "market: you cant cancel this");

    _erc721.transferFrom(address(this), _tokenOwners[_tokenId], _tokenId);
    _tokensPrice[_tokenId] = 0;
    _listedTokens[_tokenId] = false;
  }

  function buyItem(uint _tokenId) override external {
    require(_erc721.ownerOf(_tokenId) != address(0x0), "market: item not minted");
    require(_tokenOwners[_tokenId] != msg.sender, "market: you are owner");
    require(_listedTokens[_tokenId], "market: item not listed");
    require(_token.balanceOf(msg.sender) >= _tokensPrice[_tokenId], "market: not enought tokens");
    require(_token.allowance(msg.sender, address(this)) >= _tokensPrice[_tokenId], "market: approve token for marketplace");

    _erc721.transferFrom(address(this), msg.sender, _tokenId);
    _token.transferFrom(msg.sender, _tokenOwners[_tokenId], _tokensPrice[_tokenId]);

    _tokensPrice[_tokenId] = 0;
    _listedTokens[_tokenId] = false;
    _tokenOwners[_tokenId] = msg.sender;
  }

  function listItemOnAuction(uint _tokenId, uint _minPrice) override external {
    require(!_listedTokensOnAuction[_tokenId], "market auction: tokent alreadt listed on auction");
    require(msg.sender == _erc721.ownerOf(_tokenId), "market: you not token owner");
    require(_erc721.getApproved(_tokenId) == address(this), "market: you not approve token for marketplace");

    _erc721.transferFrom(_erc721.ownerOf(_tokenId), address(this), _tokenId);
    _tokensAuctionPrice[_tokenId] = _minPrice;
    _tokenOwners[_tokenId] = msg.sender;
    _listedTokensOnAuction[_tokenId] = true;
  }

  function makeBid(uint _tokenId, uint _price) override external {
    require(_erc721.ownerOf(_tokenId) != address(0x0), "market: item not minted");
    require(_listedTokensOnAuction[_tokenId], "market auction: item not listed");
    require(_token.balanceOf(msg.sender) >= _price, "market auction: not enought tokens");
    require(_token.allowance(msg.sender, address(this)) >= _price, "market auction: approve token for marketplace");
    require(_tokenOwners[_tokenId] != msg.sender, "market auction: owner cant make bid");
    require(_price > _tokensAuctionPrice[_tokenId], "market auction: new price must be more old");

    if(_lastBider[_tokenId] != address(0)) {
      _token.transfer(_lastBider[_tokenId], _tokensAuctionPrice[_tokenId]);
    }

    _lastBider[_tokenId] = msg.sender;
    _tokensAuctionPrice[_tokenId] = _price;
    _token.transferFrom(msg.sender, address(this), _price);
  }

  function finishAuction(uint _tokenId) override external {
    require(_listedTokensOnAuction[_tokenId], "market auction: item not listed");
    if (_lastBider[_tokenId] == address(0)) {
      _erc721.transferFrom(address(this), _tokenOwners[_tokenId], _tokenId);
      return;
    }

    _tokenOwners[_tokenId] = _lastBider[_tokenId];
    _token.transfer(_tokenOwners[_tokenId], _tokensAuctionPrice[_tokenId]);
    _erc721.transferFrom(address(this), _lastBider[_tokenId], _tokenId);
    delete _lastBider[_tokenId];
  }

  function cancelAuction(uint _tokenId) override external {
    require(_listedTokensOnAuction[_tokenId], "market auction: item not listed");
    if (_lastBider[_tokenId] == address(0)) {
      _erc721.transferFrom(address(this), _tokenOwners[_tokenId], _tokenId);
      return;
    }

    _token.transfer(_lastBider[_tokenId], _tokensAuctionPrice[_tokenId]);
    _erc721.transferFrom(address(this), _tokenOwners[_tokenId], _tokenId);
    delete _lastBider[_tokenId];
  }

  function getPrice(uint _tokenId) external view returns(uint) {
    return _tokensPrice[_tokenId];
  }

  function getCurrentPrice(uint _tokenId) external view returns(uint) {
    return _tokensAuctionPrice[_tokenId];
  }

  function isListed(uint _tokenId) external view returns(bool) {
    return _listedTokens[_tokenId];
  }

  function lastBider(uint _tokenId) external view returns(address) {
    return _lastBider[_tokenId];
  }
}
