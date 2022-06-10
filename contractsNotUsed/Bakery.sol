// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Cookie.sol';

contract Bakery is Ownable {

  // index of created contracts
  address[] private contracts;

  // useful to know the row count in contracts index
  function getContractCount() public view returns (uint256) {
    return contracts.length;
  }

  function getContracts() public view returns (address[] memory) {
    return contracts;
  }

  function myOwner() public view returns (address) {
    return owner();
  }

  function myAddress() public view returns (address) {
    return address(this);
  }

  // deploy a new contract
  function newCookie() public returns (address newContract) {
    Cookie c = new Cookie();
    contracts.push(address(c));
    return address(c);
  }

  function cookieAddress() public view returns (address) {
    return Cookie(contracts[0]).myAddress();
  }

  function cookieFlavor() public view returns (string memory flavor) {
    return Cookie(contracts[0]).getFlavor();
  }

  function cookieOwner() public view returns (address) {
    return Cookie(contracts[0]).getOwner();
  }

}
