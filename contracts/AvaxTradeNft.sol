// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import "hardhat/console.sol";

// "aoun1","AUN","ipfs://QmctnsCiZfT3n4x7xWbzgVafYCryVqjnR4RqcYizKpPwik/"

contract AvaxTradeNft is ERC721Enumerable, Ownable {
  using Strings for uint256;

  // data structures
  struct ArtistDS {
    uint256 id; // token id
    address artist; // creator of this nft
    uint8 commission; // in percentage
    string cid; // unique identifier for tokenUri
  }

  // state variables
  string private BASE_URI;
  string private BASE_EXTENSION = '.json';
  uint256 private COST = 0.0 ether;
  uint256 private MAX_SUPPLY = type(uint256).max;
  bool private PAUSED = false;

  // events
  event onNftMint(address indexed owner, uint256 indexed tokenId);


  mapping(uint256 => ArtistDS) private ARTIST; // mapping token id to ArtistDS
  mapping(address => uint256[]) private ARTIST_NFT_LIST; // list of token ids for a user

  constructor( string memory _name, string memory _symbol, string memory _initBaseURI) ERC721(_name, _symbol) {
    setBaseUri(_initBaseURI);
  }


  // private / internal methods
  function _baseURI() internal view virtual override returns (string memory) {
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

  function isContractPaused() public view returns (bool) {
    return PAUSED;
  }

  // todo no need for address `_to`. use msg.sender
  function mint(uint8 _commission, string memory _cid) public payable {
    require(!PAUSED, 'The contract is paused, can not mint');
    require(totalSupply() + 1 <= MAX_SUPPLY, 'Already reached max mint amount');
    require(msg.value >= COST, 'Not enough funds to mint');

    ARTIST[totalSupply() + 1] = ArtistDS({
      id: totalSupply() + 1,
      artist: msg.sender,
      commission: _commission,
      cid: _cid
    });
    ARTIST_NFT_LIST[msg.sender].push(totalSupply() + 1);

    _safeMint(msg.sender, totalSupply() + 1);

    emit onNftMint(msg.sender, totalSupply());
  }

  function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
    require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");

    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0
      ? string(abi.encodePacked(currentBaseURI, ARTIST[_tokenId].cid))
      : '';
  }

  function getNftArtist(uint256 _tokenId) public view returns (address) {
    return ARTIST[_tokenId].artist;
  }

  function getNftCommission(uint256 _tokenId) public view returns (uint8) {
    return ARTIST[_tokenId].commission;
  }

  function getNftInfo(uint256 _tokenId) public view returns (address, uint8) {
    return (ARTIST[_tokenId].artist, ARTIST[_tokenId].commission);
  }

  function getArtistNfts(address _artist) public view returns (uint256[] memory) {
    return ARTIST_NFT_LIST[_artist];
  }


  // owner only methods
  function setBaseUri(string memory _baseUri) public onlyOwner() {
    BASE_URI = _baseUri;
  }

  function setBaseExtension(string memory _baseExtension) public onlyOwner() {
    BASE_EXTENSION = _baseExtension;
  }

  function setCost(uint256 _cost) public onlyOwner() {
    COST = _cost;
  }

  function setMaxSupply(uint256 _maxSupply) public onlyOwner() {
    MAX_SUPPLY = _maxSupply;
  }

  function setContractPauseState(bool _paused) public onlyOwner() {
    PAUSED = _paused;
  }

  function withdraw() public payable onlyOwner() {
    (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
    require(success);
  }
}
