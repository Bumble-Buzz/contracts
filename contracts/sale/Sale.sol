// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./Direct.sol";
import "./Immediate.sol";
import "./Auction.sol";

import "hardhat/console.sol";


contract Sale is Initializable, UUPSUpgradeable, AccessControlUpgradeable, Direct, Immediate, Auction {

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers
  modifier checkSale(uint256 _id) {
    require(_saleExists(_id), "The sale does not exist");
    _;
  }

  // enums
  // @todo MarketItem has a SALE_TYPE enum. Either rename that one or remove it from there
  enum SALE_TYPE { direct, immediate, auction }

  // data structures
  struct SaleUserDS {
    address id; // owner of these sale items
    uint256[] direct; // direct sales
    uint256[] immediate; // immediate sales
    uint256[] auction; // auction sales
  }

  struct SaleTotalDS {
    uint256[] direct;
    uint256[] immediate;
    uint256[] auction;
  }

  struct SaleDS {
    uint256 id; // unique item id
    SALE_TYPE saleType; // type of the sale for the item
  }

  uint256[] private SALE_ITEMS; // current list of total items on sale
  mapping(uint256 => SaleDS) private SALES; // mapping item id to items on sale


  /**
    * @dev Check if sale exists
  */
  function _saleExists(uint256 _id) private view returns (bool) {
    if (SALES[_id].id != 0) {
      return true;
    }
    return false;
  }


  function initialize(address _owner, address _admin) initializer public {
    // call parent classes
    __AccessControl_init();

    // set up admin role
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

    // grant admin role to following accounts
    _setupRole(ADMIN_ROLE, _owner);
    _setupRole(ADMIN_ROLE, _admin);
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() initializer {}

  function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}


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
    * @dev Create empty sale
  */
  function createEmptySale(uint256 _id) public onlyRole(ADMIN_ROLE) {
    require(!_saleExists(_id), "Sale already exists");
    SALES[_id].id = _id;
    _addTotalSaleItemId(_id);
  }

  /**
    * @dev Create direct sale
  */
  function createSaleDirect(uint256 _id, address _owner) public onlyRole(ADMIN_ROLE) {
    require(!_saleExists(_id), "Sale already exists - Direct");
    SALES[_id] = SaleDS({
      id: _id,
      saleType: SALE_TYPE.direct
    });

    _addTotalSaleItemId(_id);
    _createDirectSale(_owner, _id);
  }

  /**
    * @dev Create immediate sale
  */
  function createSaleImmediate(uint256 _id, address _owner) public onlyRole(ADMIN_ROLE) {
    require(!_saleExists(_id), "Sale already exists - Immediate");
    SALES[_id] = SaleDS({
      id: _id,
      saleType: SALE_TYPE.immediate
    });

    _addTotalSaleItemId(_id);
    _createImmediateSale(_owner, _id);
  }

  /**
    * @dev Create auction sale
  */
  function createSaleAuction(uint256 _id, address _owner) public onlyRole(ADMIN_ROLE) {
    require(!_saleExists(_id), "Sale already exists - Auction");
    SALES[_id] = SaleDS({
      id: _id,
      saleType: SALE_TYPE.auction
    });

    _addTotalSaleItemId(_id);
    _createAuctionSale(_owner, _id);
  }

  /**
    * @dev Create sale
  */
  function createSale(uint256 _id, address _owner, SALE_TYPE _saleType) public onlyRole(ADMIN_ROLE) {
    require(!_saleExists(_id), "Sale already exists");
    if (_saleType == SALE_TYPE.direct) {
      createSaleDirect(_id, _owner);
    } else if (_saleType == SALE_TYPE.immediate) {
      createSaleImmediate(_id, _owner);
    } else if (_saleType == SALE_TYPE.auction) {
      createSaleAuction(_id, _owner);
    }
  }

  /**
    * @dev Get sale
  */
  function getSale(uint256 _id) public view checkSale(_id) returns (SaleDS memory) {
    return SALES[_id];
  }

  /**
    * @dev Is direct sale valid
  */
  function isDirectSaleValid(uint256 _id, address _owner) public view checkSale(_id) returns (bool) {
    return _doesDirectSaleItemIdExists(_owner, _id);
  } 

  /**
    * @dev Is immediate sale valid
  */
  function isImmediateSaleValid(uint256 _id, address _owner) public view checkSale(_id) returns (bool) {
    return _doesImmediateSaleItemIdExists(_owner, _id);
  }

  /**
    * @dev Is auction sale valid
  */
  function isAuctionSaleValid(uint256 _id, address _owner) public view checkSale(_id) returns (bool) {
    return _doesAuctionSaleItemIdExists(_owner, _id);
  }

  /**
    * @dev Is sale valid
  */
  function isSaleValid(uint256 _id) public view returns (bool) {
    return _saleExists(_id);
  }

  /**
    * @dev Get all direct sales
  */
  function getAllDirectSales() public view returns (uint256[] memory) {
    return _getTotalDirectSaleItemIds();
  }

  /**
    * @dev Get all immediate sales
  */
  function getAllImmediateSales() public view returns (uint256[] memory) {
    return _getTotalImmediateSaleItemIds();
  }

  /**
    * @dev Get all auction sales
  */
  function getAllAuctionSales() public view returns (uint256[] memory) {
    return _getTotalAuctionSaleItemIds();
  }

  /**
    * @dev Get all sales
  */
  function getAllSales() public view returns (SaleTotalDS memory) {
    SaleTotalDS memory sale = SaleTotalDS({
      direct: _getTotalDirectSaleItemIds(),
      immediate: _getTotalImmediateSaleItemIds(),
      auction: _getTotalAuctionSaleItemIds()
    });
    return sale;
  }

  /**
    * @dev Get direct sales for user
  */
  function getDirectSalesForUser(address _id) public view returns (uint256[] memory) {
    return _getDirectSaleItemIds(_id);
  }

  /**
    * @dev Get immediate sales for user
  */
  function getImmediateSalesForUser(address _id) public view returns (uint256[] memory) {
    return _getImmediateSaleItemIds(_id);
  }

  /**
    * @dev Get auction sales for user
  */
  function getAuctionSalesForUser(address _id) public view returns (uint256[] memory) {
    return _getAuctionSaleItemIds(_id);
  }

  /**
    * @dev Get sales for user
  */
  function getSalesForUser(address _id) public view returns (SaleUserDS memory) {
    SaleUserDS memory sale = SaleUserDS({
      id: _id,
      direct: _getDirectSaleItemIds(_id),
      immediate: _getImmediateSaleItemIds(_id),
      auction: _getAuctionSaleItemIds(_id)
    });
    return sale;
  }

  /**
    * @dev Get sales for users
  */
  function getSalesForUsers(address[] memory _ids) public view returns (SaleUserDS[] memory) {
    uint256 arrLength = _ids.length;
    SaleUserDS[] memory sales = new SaleUserDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      address id = _ids[i];
      SaleUserDS memory sale = SaleUserDS({
        id: id,
        direct: _getDirectSaleItemIds(id),
        immediate: _getImmediateSaleItemIds(id),
        auction: _getAuctionSaleItemIds(id)
    });
      sales[i] = sale;
    }
    return sales;
  }

  /**
    * @dev Remove sale for user
    * @custom:type private
  */
  function _removeSale(uint256 _id, address _owner) public checkSale(_id) {
    SALE_TYPE saleType = SALES[_id].saleType;
    if (saleType == SALE_TYPE.direct) {
      _removeDirectSale(_owner, _id);
    } else if (saleType == SALE_TYPE.immediate) {
      _removeImmediateSale(_owner, _id);
    } else if (saleType == SALE_TYPE.auction) {
      _removeAuctionSale(_owner, _id);
    }
    _removeTotalSaleItemId(_id);
    delete SALES[_id];
  }


  /** 
    *****************************************************
    ************* SALE_ITEMS Functions ***************
    *****************************************************
  */
  /**
    * @dev Add total sale item
    * @custom:type private
  */
  function _addTotalSaleItemId(uint256 _id) public {
    SALE_ITEMS.push(_id);
  }

  /**
    * @dev Get total sale item ids
  */
  function getTotalSaleItemIds() public view returns (uint256[] memory) {
    return SALE_ITEMS;
  }

  /**
    * @dev Remove total sale item id
    * @custom:type private
  */
  function _removeTotalSaleItemId(uint256 _id) public checkSale(_id) {
    uint256 arrLength = SALE_ITEMS.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < SALE_ITEMS.length; i++) {
      if (SALE_ITEMS[i] != _id) {
        data[dataCounter] = SALE_ITEMS[i];
        dataCounter++;
      }
    }
    SALE_ITEMS = data;
  }


  /** 
    *****************************************************
    ***************** Public Functions ******************
    *****************************************************
  */

}
