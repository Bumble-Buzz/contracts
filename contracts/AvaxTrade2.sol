// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

// import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./collectionItem/CollectionItem.sol";
import "./bank/Bank.sol";
import "./sale/Sale.sol";


import "./AvaxTrade.sol";

import "hardhat/console.sol";


contract AvaxTrade2 is AvaxTrade {
  /** 
    *****************************************************
    ***************** Public Functions ******************
    *****************************************************
  */
  /**
    * @dev Version of implementation contract
  */
  function version() external pure override returns (string memory) {
      return 'v2';
  }

}
