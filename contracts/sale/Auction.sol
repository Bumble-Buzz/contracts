// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "hardhat/console.sol";


contract Auction {

  // modifiers
  modifier checkAuctionSale(address _id, uint256 _itemId) {
    require(_auctionSaleExists(_id, _itemId), "This item is not a auction sale");
    _;
  }

  // enums

  // data structures

  // state variables
  uint256[] private TOTAL_AUCTION_SALES; // total auction sale items on sale
  mapping(address => uint256[]) private AUCTION_SALES; // mapping owner to auction sale items


  /**
    * @dev Check if auction item exists for user
  */
  function _auctionSaleExists(address _id, uint256 _itemId) private view returns (bool) {
    uint256[] memory items = AUCTION_SALES[_id];
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] == _itemId) {
        return true;
      }
    }
    return false;
  }


  function __Auction_init() internal {
  }


  /** 
    *****************************************************
    **************** Attribute Functions ****************
    *****************************************************
  */


  /** 
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Create auction sale item
  */
  function _createAuctionSale(address _id, uint256 _itemId) internal {
    _addTotalAuctionSale(_itemId);
    AUCTION_SALES[_id].push(_itemId);
  }

  /**
    * @dev Get number of auction sales for user
  */
  function _getAuctionSaleCount(address _id) internal view returns (uint256) {
    return AUCTION_SALES[_id].length;
  }

  /**
    * @dev Get total number of auction sales
  */
  function _getTotalAuctionSaleCount() internal view returns (uint256) {
    return _getTotalAuctionSale().length;
  }

  /**
    * @dev Get all auction item ids for user
  */
  function _getAuctionSaleItemIds(address _id) internal view returns (uint256[] memory) {
    return AUCTION_SALES[_id];
  }

  /**
    * @dev Get total auction item ids
  */
  function _getTotalAuctionSaleItemIds() internal view returns (uint256[] memory) {
    return _getTotalAuctionSale();
  }

  /**
    * @dev Does auction sale id exist
  */
  function _doesAuctionSaleItemIdExists(address _id, uint256 _itemId) internal view returns (bool) {
    return _auctionSaleExists(_id, _itemId);
  }

  /**
    * @dev Remove auction sale item
  */
  function _removeAuctionSale(address _id, uint256 _itemId) internal checkAuctionSale(_id,_itemId) {
    _removeTotalAuctionSale(_itemId);
    uint256[] memory items = AUCTION_SALES[_id];
    uint256 arrLength = items.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0; 
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] != _itemId) {
        data[dataCounter] = items[i];
        dataCounter++;
      }
    }
    AUCTION_SALES[_id] = data;
  }


  /** 
    *****************************************************
    ********** TOTAL_AUCTION_SALES Functions ************
    *****************************************************
  */
  /**
    * @dev Add a new auction sale item id
  */
  function _addTotalAuctionSale(uint256 _id) internal {
    TOTAL_AUCTION_SALES.push(_id);
  }

  /**
    * @dev Get auction sale item ids
  */
  function _getTotalAuctionSale() internal view returns (uint256[] memory) {
    return TOTAL_AUCTION_SALES;
  }

  /**
    * @dev Remove auction sale item id
  */
  function _removeTotalAuctionSale(uint256 _id) internal {
    uint256 arrLength = TOTAL_AUCTION_SALES.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < TOTAL_AUCTION_SALES.length; i++) {
      if (TOTAL_AUCTION_SALES[i] != _id) {
        data[dataCounter] = TOTAL_AUCTION_SALES[i];
        dataCounter++;
      }
    }
    TOTAL_AUCTION_SALES = data;
  }

}
