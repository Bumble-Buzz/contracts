// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "hardhat/console.sol";


contract Direct {

  // modifiers
  modifier checkDirectSale(address _id, uint256 _itemId) {
    require(_directSaleExists(_id, _itemId), "This item is not a direct sale");
    _;
  }

  // enums

  // data structures

  // state variables
  uint256[] private TOTAL_DIRECT_SALES; // total direct sale items on sale
  mapping(address => uint256[]) private DIRECT_SALES; // mapping owner to direct sale items


  /**
    * @dev Check if direct item exists for user
  */
  function _directSaleExists(address _id, uint256 _itemId) private view returns (bool) {
    uint256[] memory items = DIRECT_SALES[_id];
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] == _itemId) {
        return true;
      }
    }
    return false;
  }


  function __Direct_init() internal {
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
    * @dev Create direct sale item
  */
  function _createDirectSale(address _id, uint256 _itemId) internal {
    _addTotalDirectSale(_itemId);
    DIRECT_SALES[_id].push(_itemId);
  }

  /**
    * @dev Get number of direct sales for user
  */
  function _getDirectSaleCount(address _id) internal view returns (uint256) {
    return DIRECT_SALES[_id].length;
  }

  /**
    * @dev Get total number of direct sales
  */
  function _getTotalDirectSaleCount() internal view returns (uint256) {
    return _getTotalDirectSale().length;
  }

  /**
    * @dev Get direct item ids for user
  */
  function _getDirectSaleItemIds(address _id) internal view returns (uint256[] memory) {
    return DIRECT_SALES[_id];
  }

  /**
    * @dev Get total direct item ids
  */
  function _getTotalDirectSaleItemIds() internal view returns (uint256[] memory) {
    return _getTotalDirectSale();
  }

  /**
    * @dev Does direct sale id exist
  */
  function _doesDirectSaleItemIdExists(address _id, uint256 _itemId) internal view returns (bool) {
    return _directSaleExists(_id, _itemId);
  }

  /**
    * @dev Remove direct sale item
  */
  function _removeDirectSale(address _id, uint256 _itemId) internal checkDirectSale(_id,_itemId) {
    _removeTotalDirectSale(_itemId);
    uint256[] memory items = DIRECT_SALES[_id];
    uint256 arrLength = items.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0; 
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] != _itemId) {
        data[dataCounter] = items[i];
        dataCounter++;
      }
    }
    DIRECT_SALES[_id] = data;
  }


  /** 
    *****************************************************
    ************* TOTAL_DIRECT_SALES Functions ***************
    *****************************************************
  */
  /**
    * @dev Add a new direct sale item id
  */
  function _addTotalDirectSale(uint256 _id) internal {
    TOTAL_DIRECT_SALES.push(_id);
  }

  /**
    * @dev Get direct sale item ids
  */
  function _getTotalDirectSale() internal view returns (uint256[] memory) {
    return TOTAL_DIRECT_SALES;
  }

  /**
    * @dev Remove direct sale item id
  */
  function _removeTotalDirectSale(uint256 _id) internal {
    uint256 arrLength = TOTAL_DIRECT_SALES.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < TOTAL_DIRECT_SALES.length; i++) {
      if (TOTAL_DIRECT_SALES[i] != _id) {
        data[dataCounter] = TOTAL_DIRECT_SALES[i];
        dataCounter++;
      }
    }
    TOTAL_DIRECT_SALES = data;
  }

}
