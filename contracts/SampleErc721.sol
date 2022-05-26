// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import "hardhat/console.sol";

contract SampleErc721 is ERC721Enumerable {
    constructor() ERC721("SampleERC721", "SPL") {}

    function mint(uint256 tokenId) public payable {
        _mint(msg.sender, tokenId);
    }
}
