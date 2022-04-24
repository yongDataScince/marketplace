//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFT721 is ERC721, AccessControl {
  using Strings for uint256;
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  string private _baseURIext;
  uint private _tokenIDs = 0;

  mapping(uint => address) private _owners;
  mapping(address => uint) private _balances;
  mapping(uint => address) private _tokenApprovals;
  mapping(address => mapping(address => bool)) private _operatorApprovals;
  mapping(uint => string) private _tokenURIs;

  event SetBase(string _uri);

  constructor (string memory name_, string memory symbol_, string memory baseUri_) ERC721(name_, symbol_) {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _baseURIext = baseUri_;
  }

  modifier onlyTokenOwner(uint _tokenId) {
    require(msg.sender == ownerOf(_tokenId), "[ERC721] you not owner of token");
    _;
  }

  function createMinter(address _minter) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
    _setupRole(MINTER_ROLE, _minter);
  }

  function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
    require(ownerOf(tokenId) != address(0), "ERC721: operator query for nonexistent token");
    address owner = ownerOf(tokenId);
    return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
  }

  function balanceOf(address _owner) public view override returns(uint) {
    return _balances[_owner];
  }

  function ownerOf(uint _tokenId) public view override returns(address) {
    return _owners[_tokenId];
  }

  function isApprovedForAll(address _owner, address _operator) public view override returns(bool) {
    return _operatorApprovals[_owner][_operator];
  }

  function approve(address _approved, uint _tokenId) public override virtual onlyTokenOwner(_tokenId) {
    _tokenApprovals[_tokenId] = _approved;
    emit Approval(msg.sender, _approved, _tokenId);
  }
  
  function getApproved(uint _tokenId) public view override returns(address) {
    return _tokenApprovals[_tokenId];
  }

  function setApprovalForAll(address _operator, bool _approved) public override {
    _operatorApprovals[msg.sender][_operator] = _approved;
    emit ApprovalForAll(msg.sender, _operator, _approved);
  }

  function setBaseURI(string memory _uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _baseURIext = _uri;
  }

  function _clearApproval(address owner, uint256 tokenId) internal {
    require(ownerOf(tokenId) == owner, "ERC721: owner dont have this token");
    if (_tokenApprovals[tokenId] != address(0)) {
      _tokenApprovals[tokenId] = address(0);
    }
  }

  function transferFrom(address _from, address _to, uint _tokenId) public virtual override {
      require(_isApprovedOrOwner(msg.sender, _tokenId), "ERC721: you can't spend this");
      _balances[_from] -= 1;
      _balances[_to] += 1;
      _clearApproval(_from, _tokenId);
      _owners[_tokenId] = _to;

      emit Transfer(_from, _to, _tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public pure override(AccessControl, ERC721) returns (bool) {
    return interfaceId == type(IERC721).interfaceId;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    string memory base = baseURI();

    if (bytes(base).length > 0) {
      return bytes(_tokenURIs[tokenId]).length > 0 ? string(abi.encodePacked(base, _tokenURIs[tokenId])) : string(abi.encodePacked(base, tokenId.toString()));
    }
    return "";
  }

  function baseURI() public view virtual returns (string memory) {
    return _baseURIext;
  }

  function mint(address _to, string memory _uri) public {
    require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");

    _owners[_tokenIDs] = _to;
    _balances[_to] += 1;
    _tokenURIs[_tokenIDs] = _uri;
    
    emit Transfer(address(0), _to, _tokenIDs);
    _tokenIDs += 1;
  }
}