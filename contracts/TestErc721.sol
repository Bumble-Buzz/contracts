// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import "hardhat/console.sol";

contract TestErc721 is ERC721Enumerable {
    constructor( string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function mint(uint256 tokenId) public payable {
        _mint(msg.sender, tokenId);
    }
}
