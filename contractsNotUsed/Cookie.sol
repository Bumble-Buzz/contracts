// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';


contract Cookie is Ownable {

  function myAddress() public view returns (address) {
    return address(this);
  }

  function getFlavor() public pure returns (string memory flavor) {
    return "mmm ... chocolate chip";
  }

  function getOwner() public view returns (address) {
    return owner();
  }
}