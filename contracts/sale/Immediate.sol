// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "hardhat/console.sol";


contract Immediate {

  // modifiers
  modifier checkImmediateSale(address _id, uint256 _itemId) {
    require(_immediateSaleExists(_id, _itemId), "This item is not a immediate sale");
    _;
  }

  // enums

  // data structures

  // state variables
  uint256[] private TOTAL_IMMEDIATE_SALES; // total immediate sale items on sale
  mapping(address => uint256[]) private IMMEDIATE_SALES; // mapping owner to immediate sale items


  /**
    * @dev Check if immediate item exists for user
  */
  function _immediateSaleExists(address _id, uint256 _itemId) private view returns (bool) {
    uint256[] memory items = IMMEDIATE_SALES[_id];
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] == _itemId) {
        return true;
      }
    }
    return false;
  }


  function __Immediate_init() internal {
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
    * @dev Create immediate sale item
  */
  function _createImmediateSale(address _id, uint256 _itemId) internal {
    _addTotalImmediateSale(_itemId);
    IMMEDIATE_SALES[_id].push(_itemId);
  }

  /**
    * @dev Get number of immediate sales for user
  */
  function _getImmediateSaleCount(address _id) internal view returns (uint256) {
    return IMMEDIATE_SALES[_id].length;
  }

  /**
    * @dev Get total number of immediate sales
  */
  function _getTotalImmediateSaleCount() internal view returns (uint256) {
    return _getTotalImmediateSale().length;
  }

  /**
    * @dev Get all immediate item ids for user
  */
  function _getImmediateSaleItemIds(address _id) internal view returns (uint256[] memory) {
    return IMMEDIATE_SALES[_id];
  }

  /**
    * @dev Get total immediate item ids
  */
  function _getTotalImmediateSaleItemIds() internal view returns (uint256[] memory) {
    return _getTotalImmediateSale();
  }

  /**
    * @dev Does immediate sale id exist
  */
  function _doesImmediateSaleItemIdExists(address _id, uint256 _itemId) internal view returns (bool) {
    return _immediateSaleExists(_id, _itemId);
  }

  /**
    * @dev Remove immediate sale item
  */
  function _removeImmediateSale(address _id, uint256 _itemId) internal checkImmediateSale(_id,_itemId) {
    _removeTotalImmediateSale(_itemId);
    uint256[] memory items = IMMEDIATE_SALES[_id];
    uint256 arrLength = items.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0; 
    for (uint256 i = 0; i < items.length; i++) {
      if (items[i] != _itemId) {
        data[dataCounter] = items[i];
        dataCounter++;
      }
    }
    IMMEDIATE_SALES[_id] = data;
  }


  /** 
    *****************************************************
    ********* TOTAL_IMMEDIATE_SALES Functions ***********
    *****************************************************
  */
  /**
    * @dev Add a new immediate sale item id
  */
  function _addTotalImmediateSale(uint256 _id) internal {
    TOTAL_IMMEDIATE_SALES.push(_id);
  }

  /**
    * @dev Get immediate sale item ids
  */
  function _getTotalImmediateSale() internal view returns (uint256[] memory) {
    return TOTAL_IMMEDIATE_SALES;
  }

  /**
    * @dev Remove immediate sale item id
  */
  function _removeTotalImmediateSale(uint256 _id) internal {
    uint256 arrLength = TOTAL_IMMEDIATE_SALES.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < TOTAL_IMMEDIATE_SALES.length; i++) {
      if (TOTAL_IMMEDIATE_SALES[i] != _id) {
        data[dataCounter] = TOTAL_IMMEDIATE_SALES[i];
        dataCounter++;
      }
    }
    TOTAL_IMMEDIATE_SALES = data;
  }

}
