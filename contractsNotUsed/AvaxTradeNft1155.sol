// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import '@openzeppelin/contracts/access/Ownable.sol';

import "hardhat/console.sol";

// "aoun1","AUN","ipfs://QmctnsCiZfT3n4x7xWbzgVafYCryVqjnR4RqcYizKpPwik/"

contract AvaxTradeNft1155 is ERC1155, Ownable {

  // state variables
  string private BASE_URI;
  string private BASE_EXTENSION = '.json';
  string private NOT_REVEALED_URI;
  uint256 private COST = 0.5 ether;
  uint256 private MAX_SUPPLY = 10000;
  uint8 private MIN_MINT_AMMOUNT = 1;
  uint8 private MAX_MINT_AMMOUNT = 1;
  bool private PAUSED = false;
  bool private REVEALED = true;

  uint8 private HONORARY_MAX_SUPPLY = 5;


  // enums
  enum TOKEN_TYPE { GOLD, HELMET, SWORD, SHIELD, SHOES }

  // data structures
  struct TokenDS {
    TOKEN_TYPE tokenType;
    uint256 maxSupply;
  }

  mapping(TOKEN_TYPE => TokenDS) private TOKENS;


  constructor(string memory _initBaseURI) ERC1155(_initBaseURI) {
    setBaseUri(_initBaseURI);

    TOKENS[TOKEN_TYPE.GOLD] = TokenDS(TOKEN_TYPE.GOLD, 9999);
    TOKENS[TOKEN_TYPE.HELMET] = TokenDS(TOKEN_TYPE.HELMET, 999);
    TOKENS[TOKEN_TYPE.SWORD] = TokenDS(TOKEN_TYPE.SWORD, 999);
    TOKENS[TOKEN_TYPE.SHIELD] = TokenDS(TOKEN_TYPE.SHIELD, 999);
    TOKENS[TOKEN_TYPE.SHOES] = TokenDS(TOKEN_TYPE.SHOES, 999);
  }


  // private / internal methods
  function _baseURI() internal view virtual returns (string memory) {
    return BASE_URI;
  }

  function _getBaseExtension() private view returns (string memory) {
    return BASE_EXTENSION;
  }


  // public methods
  function getCost() public view returns (uint256) {
    return COST;
  }

  function getMaxSupply() public view returns (uint256) {
    return MAX_SUPPLY;
  }

  function getMinMintAmount() public view returns (uint8) {
    return MIN_MINT_AMMOUNT;
  }

  function getMaxMintAmount() public view returns (uint8) {
    return MAX_MINT_AMMOUNT;
  }

  function isContractPaused() public view returns (bool) {
    return PAUSED;
  }

  function isContractRevealed() public view returns (bool) {
    return REVEALED;
  }

  function mint(uint256 _id, uint8 _mintAmount) public payable {
    require(!PAUSED, 'The contract is paused, can not mint');
    require(_mintAmount >= MIN_MINT_AMMOUNT, 'Mint amount must be greater');
    require(_mintAmount <= MAX_MINT_AMMOUNT, 'Mint amount too big');
    require(balanceOf(msg.sender, _id) + _mintAmount <= MAX_SUPPLY, 'Already reached max mint amount');

    if (msg.sender != owner()) {
      require(msg.value >= COST * _mintAmount, 'Not enough funds to mint');
    }

    for (uint8 i = 1; i <= _mintAmount; i++) {
      _mint(msg.sender, _id, _mintAmount, "");
    }
  }

  // function uri(uint256 tokenId) public view virtual override returns (string memory) {
  //   // require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

  //   // if token is not yet revealed, return a specific uri
  //   if(!REVEALED) {
  //       return NOT_REVEALED_URI;
  //   }

  //   string memory currentBaseURI = _baseURI();
  //   return bytes(currentBaseURI).length > 0
  //     ? string(abi.encodePacked(currentBaseURI, tokenId, BASE_EXTENSION))
  //     : '';
  // }


  // owner only methods
  function setBaseUri(string memory _baseUri) public onlyOwner() {
    BASE_URI = _baseUri;
  }

  function setBaseExtension(string memory _baseExtension) public onlyOwner() {
    BASE_EXTENSION = _baseExtension;
  }

  function setNotRevealedUri(string memory _notRevealedUri) public onlyOwner() {
    NOT_REVEALED_URI = _notRevealedUri;
  }

  function setCost(uint256 _cost) public onlyOwner() {
    COST = _cost;
  }

  function setMaxSupply(uint256 _maxSupply) public onlyOwner() {
    MAX_SUPPLY = _maxSupply;
  }

  function setMinMintAmount(uint8 _minMintAmount) public onlyOwner() {
    MIN_MINT_AMMOUNT = _minMintAmount;
  }

  function setMaxMintAmount(uint8 _maxMintAmount) public onlyOwner() {
    MAX_MINT_AMMOUNT = _maxMintAmount;
  }

  function setContractPauseState(bool _paused) public onlyOwner() {
    PAUSED = _paused;
  }

  function setContractRevealState(bool _revealed) public onlyOwner() {
    REVEALED = _revealed;
  }

  function withdraw() public payable onlyOwner() {
    (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
    require(success);
  }
}
