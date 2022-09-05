// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import "@openzeppelin/contracts/utils/Counters.sol";

// import "./Direct.sol";
// import "./Immediate.sol";
// import "./Auction.sol";

import "hardhat/console.sol";


contract NewSale is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
  using Counters for Counters.Counter;

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers
  modifier checkSale(uint256 _id) {
    require(_saleExists(_id), "The sale does not exist");
    _;
  }

  // enums
  event onCreateMarketSale(uint256 indexed saleId, uint256 indexed tokenId, address indexed contractAddress, address seller, SALE_TYPE saleType);
  event onCreateDirectSale(uint256 indexed saleId, uint256 indexed tokenId, address indexed contractAddress, address escrow, address seller);
  event onCreateImmediateSale(uint256 indexed saleId, uint256 indexed tokenId, address indexed contractAddress, address escrow, address seller);
  event onCreateAuctionSale(uint256 indexed saleId, uint256 indexed tokenId, address indexed contractAddress, address escrow, address seller);

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

  struct SaleIdDS {
    uint256 id; // unique sale id
    address owner; // owner of the asset
    address contractAddress; // asset contract address
    uint256 tokenId; // asset token id
    SALE_TYPE saleType; // type of the sale for this asset
  }

  Counters.Counter private SALE_ID_COUNTER; // tracks total number of collections
  mapping(uint256 => SaleIdDS) private NEW_SALES; // mapping sale id to items on sale
  mapping(address => uint256[]) private NEW_SALES_OWNER; // mapping owner to their items on sale

  uint256[] private SALE_ITEMS; // current list of total items on sale
  uint256[] private SALE_ITEMS_DIRECT; // current list of total items on sale
  uint256[] private SALE_ITEMS_IMMEDIATE; // current list of total items on sale
  uint256[] private SALE_ITEMS_AUCTION; // current list of total items on sale

  mapping(uint256 => SaleDS) private SALES; // mapping item id to items on sale


  /**
    * @dev Check if sale exists
  */
  function _saleExists(uint256 _id) private view returns (bool) {
    if (NEW_SALES[_id].id != 0) {
      return true;
    }
    return false;
  }

  // @custom:type library
  function indexOf(uint256[] memory arr, uint256 searchFor) private pure returns (uint256) {
    for (uint256 i = 0; i < arr.length; i++) {
      if (arr[i] == searchFor) {
        return i;
      }
    }
    revert("Not Found");
  }


  function initialize(address _owner) initializer public {
    // call parent classes
    __AccessControl_init();

    // set up admin role
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

    // grant admin role to following accounts
    _setupRole(ADMIN_ROLE, _owner);
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
    * @dev Get sale id pointer
  */
  function _getSaleIdPointer() private view returns (uint256) {
    return SALE_ID_COUNTER.current();
  }

  /**
    * @dev Reset sale id pointer to 0
  */
  function _resetSaleIdPointer() private {
    SALE_ID_COUNTER.reset();
  }


  /** 
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Create direct sale
  */
  function createDirectSale(
    uint256 _tokenId, address _contractAddress, address _buyer, uint256 _price, SALE_TYPE _saleType
  ) external nonReentrant() payable {
    require(_price > 0, 'Buy price must be greater than 0 - Direct');
    require(_saleType == SALE_TYPE.direct, "Incorrect sale type - Direct");
    require(IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId), "Not a valid ERC 721 contract - Direct");

    address buyer = _buyer;
    buyer = address(0);

    SALE_ID_COUNTER.increment();
    uint256 saleId = SALE_ID_COUNTER.current();

    NEW_SALES[saleId] = SaleIdDS({
      id: saleId,
      owner: msg.sender,
      contractAddress: _contractAddress,
      tokenId: _tokenId,
      saleType: SALE_TYPE.direct
    });

    _addSaleItem(saleId);
    _addDirectSaleItem(saleId);
    _addSaleToOwner(msg.sender, saleId);

    // todo create escrow contract

    // if (IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId)) {
    //   // ownerOf(_tokenId) == msg.sender then continue, else revert transaction
    //   require(IERC721(_contractAddress).ownerOf(_tokenId) == msg.sender, "You are not the owner of this item");

    //   // transfer nft to market place
    //   IERC721(_contractAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
    // } else {
    //   revert("Provided contract address is not valid");
    // }

    // @todo the escrow is the escrow contract address
    address escrow = address(0);
    emit onCreateDirectSale(saleId, _tokenId, _contractAddress, escrow, msg.sender);
  }

  /**
    * @dev Create immediate sale
  */
  function createImmediateSale(
    uint256 _tokenId, address _contractAddress, uint256 _price, SALE_TYPE _saleType
  ) external nonReentrant() payable {
    require(_price > 0, 'Buy price must be greater than 0 - Immediate');
    require(_saleType == SALE_TYPE.immediate, "Incorrect sale type - Immediate");
    require(IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId), "Not a valid ERC 721 contract - Immediate");

    SALE_ID_COUNTER.increment();
    uint256 saleId = SALE_ID_COUNTER.current();

    NEW_SALES[saleId] = SaleIdDS({
      id: saleId,
      owner: msg.sender,
      contractAddress: _contractAddress,
      tokenId: _tokenId,
      saleType: SALE_TYPE.immediate
    });

    _addSaleItem(saleId);
    _addImmediateSaleItem(saleId);
    _addSaleToOwner(msg.sender, saleId);

    // todo create escrow contract

    // @todo the escrow is the escrow contract address
    address escrow = address(0);
    emit onCreateImmediateSale(saleId, _tokenId, _contractAddress, escrow, msg.sender);
  }

  /**
    * @dev Create auction sale
  */
  function createAuctionSale(
    uint256 _tokenId, address _contractAddress, uint256 _price, SALE_TYPE _saleType
  ) external nonReentrant() payable {
    require(_price > 0, 'Buy price must be greater than 0 - Auction');
    require(_saleType == SALE_TYPE.auction, "Incorrect sale type - Auction");
    require(IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId), "Not a valid ERC 721 contract - Auction");

    SALE_ID_COUNTER.increment();
    uint256 saleId = SALE_ID_COUNTER.current();

    NEW_SALES[saleId] = SaleIdDS({
      id: saleId,
      owner: msg.sender,
      contractAddress: _contractAddress,
      tokenId: _tokenId,
      saleType: SALE_TYPE.auction
    });

    _addSaleItem(saleId);
    _addAuctionSaleItem(saleId);
    _addSaleToOwner(msg.sender, saleId);

    // todo create escrow contract

    // @todo the escrow is the escrow contract address
    address escrow = address(0);
    emit onCreateAuctionSale(saleId, _tokenId, _contractAddress, escrow, msg.sender);
  }

  /**
    * @dev Is direct sale valid
  */
  function isDirectSaleValid(uint256 _id) public view checkSale(_id) returns (bool) {
    return (NEW_SALES[_id].saleType == SALE_TYPE.direct);
  } 

  /**
    * @dev Is immediate sale valid
  */
  function isImmediateSaleValid(uint256 _id) public view checkSale(_id) returns (bool) {
    return (NEW_SALES[_id].saleType == SALE_TYPE.immediate);
  }

  /**
    * @dev Is auction sale valid
  */
  function isAuctionSaleValid(uint256 _id) public view checkSale(_id) returns (bool) {
    return (NEW_SALES[_id].saleType == SALE_TYPE.auction);
  }

  /**
    * @dev Is sale valid
  */
  function isSaleValid(uint256 _id) public view returns (bool) {
    return _saleExists(_id);
  }

  /**
    * @dev Get all direct sales IDs
  */
  function getAllDirectSaleIds() public view returns (uint256[] memory) {
    return _getDirectSaleItems();
  }

  /**
    * @dev Get all immediate sales IDs
  */
  function getAllImmediateSaleIds() public view returns (uint256[] memory) {
    return _getImmediateSaleItems();
  }

  /**
    * @dev Get all auction sales IDs
  */
  function getAllAuctionSaleIds() public view returns (uint256[] memory) {
    return _getAuctionSaleItems();
  }

  /**
    * @dev Get all sales Ids
  */
  function getAllSalesIds() public view returns (SaleTotalDS memory) {
    SaleTotalDS memory sale = SaleTotalDS({
      direct: _getDirectSaleItems(),
      immediate: _getImmediateSaleItems(),
      auction: _getAuctionSaleItems()
    });
    return sale;
  }

  /**
    * @dev Get sale
  */
  function getSale(uint256 _id) public view checkSale(_id) returns (SaleIdDS memory) {
    return NEW_SALES[_id];
  }

  /**
    * @dev Get all direct sales
  */
  function getAllDirectSale() public view returns (SaleIdDS[] memory) {
    SaleIdDS[] memory data = new SaleIdDS[](SALE_ITEMS.length);
    for (uint256 i = 0; i < SALE_ITEMS.length; i++) {
      uint256 index = SALE_ITEMS[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.direct) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get all immediate sales
  */
  function getAllImmediateSale() public view returns (SaleIdDS[] memory) {
    SaleIdDS[] memory data = new SaleIdDS[](SALE_ITEMS.length);
    for (uint256 i = 0; i < SALE_ITEMS.length; i++) {
      uint256 index = SALE_ITEMS[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.immediate) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get all auction sales
  */
  function getAllAuctionSale() public view returns (SaleIdDS[] memory) {
    SaleIdDS[] memory data = new SaleIdDS[](SALE_ITEMS.length);
    for (uint256 i = 0; i < SALE_ITEMS.length; i++) {
      uint256 index = SALE_ITEMS[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.auction) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get all sales
  */
  function getAllSales() public view returns (SaleIdDS[] memory) {
    SaleIdDS[] memory data = new SaleIdDS[](SALE_ITEMS.length);
    for (uint256 i = 0; i < SALE_ITEMS.length; i++) {
      uint256 index = SALE_ITEMS[i];
      SaleIdDS memory sale = SaleIdDS({
        id: NEW_SALES[index].id,
        owner: NEW_SALES[index].owner,
        contractAddress: NEW_SALES[index].contractAddress,
        tokenId: NEW_SALES[index].tokenId,
        saleType: NEW_SALES[index].saleType
      });
      data[i] = sale;
    }
    return data;
  }

  /**
    * @dev Get direct sale IDs for user
  */
  function getDirectSaleIdsForUser(address _owner) public view returns (uint256[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    uint256[] memory data = new uint256[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.direct) {
        data[i] = NEW_SALES[index].id;
      }
    }
    return data;
  }

  /**
    * @dev Get immediate sale IDss for user
  */
  function getImmediateSaleIDsForUser(address _owner) public view returns (uint256[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    uint256[] memory data = new uint256[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.immediate) {
        data[i] = NEW_SALES[index].id;
      }
    }
    return data;
  }

  /**
    * @dev Get auction sale IDss for user
  */
  function getAuctionSaleIDsForUser(address _owner) public view returns (uint256[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    uint256[] memory data = new uint256[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.auction) {
        data[i] = NEW_SALES[index].id;
      }
    }
    return data;
  }

  /**
    * @dev Get direct sales for user
  */
  function getDirectSalesForUser(address _owner) public view returns (SaleIdDS[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    SaleIdDS[] memory data = new SaleIdDS[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.direct) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get immediate sales for user
  */
  function getImmediateSalesForUser(address _owner) public view returns (SaleIdDS[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    SaleIdDS[] memory data = new SaleIdDS[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.immediate) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get auction sales for user
  */
  function getAuctionSalesForUser(address _owner) public view returns (SaleIdDS[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    SaleIdDS[] memory data = new SaleIdDS[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      if (NEW_SALES[index].saleType == SALE_TYPE.auction) {
        SaleIdDS memory sale = SaleIdDS({
          id: NEW_SALES[index].id,
          owner: NEW_SALES[index].owner,
          contractAddress: NEW_SALES[index].contractAddress,
          tokenId: NEW_SALES[index].tokenId,
          saleType: NEW_SALES[index].saleType
        });
        data[i] = sale;
      }
    }
    return data;
  }

  /**
    * @dev Get sales for user
  */
  function getSalesForUser(address _owner) public view returns (SaleIdDS[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    SaleIdDS[] memory data = new SaleIdDS[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      SaleIdDS memory sale = SaleIdDS({
        id: NEW_SALES[index].id,
        owner: NEW_SALES[index].owner,
        contractAddress: NEW_SALES[index].contractAddress,
        tokenId: NEW_SALES[index].tokenId,
        saleType: NEW_SALES[index].saleType
      });
      data[i] = sale;
    }
    return data;
  }

  // /**
  //   * @dev Get sales for users
  // */
  // function getSalesForUsers(address[] memory _ids) public view returns (SaleUserDS[] memory) {
  //   uint256 arrLength = _ids.length;
  //   SaleUserDS[] memory sales = new SaleUserDS[](arrLength);
  //   for (uint256 i = 0; i < arrLength; i++) {
  //     address id = _ids[i];
  //     SaleUserDS memory sale = SaleUserDS({
  //       id: id,
  //       direct: _getDirectSaleItemIds(id),
  //       immediate: _getImmediateSaleItemIds(id),
  //       auction: _getAuctionSaleItemIds(id)
  //   });
  //     sales[i] = sale;
  //   }
  //   return sales;
  // }

  /**
    * @dev Remove sale for user
    * @custom:type private
  */
  function _removeSale(uint256 _id, address _owner) public checkSale(_id) {
    SALE_TYPE saleType = SALES[_id].saleType;
    if (saleType == SALE_TYPE.direct) {
      _removeDirectSaleItem(_id);
    } else if (saleType == SALE_TYPE.immediate) {
      _removeImmediateSaleItem(_id);
    } else if (saleType == SALE_TYPE.auction) {
      _removeAuctionSaleItem(_id);
    }
    _removeSaleOwner(_owner);
    _removeSaleItem(_id);
  }


  /** 
    *****************************************************
    ************* NEW_SALES_OWNER Functions ***************
    *****************************************************
  */
  /**
    * @dev Add sale to owner
    * @custom:type private
  */
  function _addSaleToOwner(address _owner, uint256 _id) private {
    NEW_SALES_OWNER[_owner].push(_id);
  }

  /**
    * @dev Get sale IDs of owner
  */
  function getSaleIdsOfOwner(address _owner) public view returns (uint256[] memory) {
    return NEW_SALES_OWNER[_owner];
  }

  /**
    * @dev Get sales of owner
  */
  function getSalesOfOwner(address _owner) public view returns (SaleIdDS[] memory) {
    uint256[] memory ownerSaleIds = NEW_SALES_OWNER[_owner];
    SaleIdDS[] memory data = new SaleIdDS[](ownerSaleIds.length);
    for (uint256 i = 0; i < ownerSaleIds.length; i++) {
      uint256 index = ownerSaleIds[i];
      SaleIdDS memory sale = SaleIdDS({
        id: NEW_SALES[index].id,
        owner: NEW_SALES[index].owner,
        contractAddress: NEW_SALES[index].contractAddress,
        tokenId: NEW_SALES[index].tokenId,
        saleType: NEW_SALES[index].saleType
      });
      data[i] = sale;
    }
    return data;
  }

  /**
    * @dev Remove sale of owner
    * @custom:type private
  */
  function _removeSaleOfOwner(address _owner, uint256 _id) private {
    uint256[] memory data = NEW_SALES_OWNER[_owner];
    uint256 indexOfSaleId = indexOf(data, _id);
    NEW_SALES_OWNER[_owner][indexOfSaleId] = data[data.length - 1];
    NEW_SALES_OWNER[_owner].pop();
  }

  /**
    * @dev Remove sale owner
    * @custom:type private
  */
  function _removeSaleOwner(address _owner) private {
    delete NEW_SALES_OWNER[_owner];
  }


  /** 
    *****************************************************
    *************** SALE_ITEMS Functions ****************
    *****************************************************
  */
  /**
    * @dev Add total sale item
    * @custom:type private
  */
  function _addSaleItem(uint256 _id) private {
    SALE_ITEMS.push(_id);
  }

  /**
    * @dev Get total sale item ids
  */
  function _getSaleItem(uint256 _id) public view returns (uint256) {
    return SALE_ITEMS[_id];
  }

  /**
    * @dev Get total sale item ids
  */
  function _getSaleItems() public view returns (uint256[] memory) {
    return SALE_ITEMS;
  }

  /**
    * @dev Remove total sale item
    * @custom:type private
  */
  function _removeSaleItem(uint256 _id) private checkSale(_id) {
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
    *********** SALE_ITEMS_DIRECT Functions *************
    *****************************************************
  */
  /**
    * @dev Add direct sale item
    * @custom:type private
  */
  function _addDirectSaleItem(uint256 _id) private {
    SALE_ITEMS_DIRECT.push(_id);
  }

  /**
    * @dev Get direct sale item ids
  */
  function _getDirectSaleItems() public view returns (uint256[] memory) {
    return SALE_ITEMS_DIRECT;
  }

  /**
    * @dev Remove direct sale item
    * @custom:type private
  */
  function _removeDirectSaleItem(uint256 _id) private checkSale(_id) {
    uint256[] memory data = SALE_ITEMS_DIRECT;
    uint256 indexOfSaleId = indexOf(data, _id);
    SALE_ITEMS_DIRECT[indexOfSaleId] = data[data.length - 1];
    SALE_ITEMS_DIRECT.pop();
  }


  /** 
    *****************************************************
    ********** SALE_ITEMS_IMMEDIATE Functions ***********
    *****************************************************
  */
  /**
    * @dev Add immediate sale item
    * @custom:type private
  */
  function _addImmediateSaleItem(uint256 _id) private {
    SALE_ITEMS_IMMEDIATE.push(_id);
  }

  /**
    * @dev Get immediate sale item ids
  */
  function _getImmediateSaleItems() public view returns (uint256[] memory) {
    return SALE_ITEMS_IMMEDIATE;
  }

  /**
    * @dev Remove immediate sale item
    * @custom:type private
  */
  function _removeImmediateSaleItem(uint256 _id) private checkSale(_id) {
    uint256[] memory data = SALE_ITEMS_IMMEDIATE;
    uint256 indexOfSaleId = indexOf(data, _id);
    SALE_ITEMS_IMMEDIATE[indexOfSaleId] = data[data.length - 1];
    SALE_ITEMS_IMMEDIATE.pop();
  }


  /** 
    *****************************************************
    *********** SALE_ITEMS_AUCTION Functions ************
    *****************************************************
  */
  /**
    * @dev Add auction sale item
    * @custom:type private
  */
  function _addAuctionSaleItem(uint256 _id) private {
    SALE_ITEMS_AUCTION.push(_id);
  }

  /**
    * @dev Get auction sale item ids
  */
  function _getAuctionSaleItems() public view returns (uint256[] memory) {
    return SALE_ITEMS_AUCTION;
  }

  /**
    * @dev Remove auction sale item
    * @custom:type private
  */
  function _removeAuctionSaleItem(uint256 _id) private checkSale(_id) {
    uint256[] memory data = SALE_ITEMS_AUCTION;
    uint256 indexOfSaleId = indexOf(data, _id);
    SALE_ITEMS_AUCTION[indexOfSaleId] = data[data.length - 1];
    SALE_ITEMS_AUCTION.pop();
  }


  /** 
    *****************************************************
    ***************** Public Functions ******************
    *****************************************************
  */

}
