// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts/utils/Counters.sol";


contract Item {
  using Counters for Counters.Counter;

  // modifiers
  modifier checkItem(uint256 _id) {
    require(_itemExists(_id), "The item does not exist");
    _;
  }
  modifier checkSellerIsOwner(uint256 _id, address _owner) {
    require(_isSellerOwner(_id, _owner), "This user is not the owner of the item");
    _;
  }

  /**
    * Note All calculations using percentages will truncate any decimals.
    * Instead whole numbers will be used.
    *
    * Examples: number = (num * perVar / 100);
    *   - 2% of 100 = 2
    *   - 2% of 75 = 1
    *   - 2% of 50 = 1
    *   - 2% of 20 = 0
  */

  // enums

  // data structures
  struct ItemDS {
    uint256 id; // unique item id
    uint256 collectionId; // collection id associated with this item
    uint256 tokenId; // unique token id of the item
    address contractAddress;
    address seller; // address of the seller / current owner
    address buyer; // address of the buyer / next owner (empty if not yet bought)
    uint256 price; // price of the item
    uint8 commission; // in percentage
    address creator; // original creator of the item
    bool sold;
    bool active;
  }

  // state variables

  /**
    * @dev We use the same ITEM_ID_POINTER to track the size of the items, and also
    * use it to know which index in the mapping we want to add the new item.
    * Example:  if ITEM_ID_POINTER = 5
    *           We know there are 5 collections, but we also know in the mapping the
    *           item id's are as follows: 0,1,2,3,4
    * So next time when we need to add a new item, we use the same ITEM_ID_POINTER variable
    * to add item in index '5', and then increment size +1 in end because now we have 6 collections
  */
  Counters.Counter private ITEM_ID_POINTER; // tracks total number of items
  uint256[] private ITEM_IDS; // current list of items on sale
  mapping(uint256 => ItemDS) private ITEMS; // mapping item id to market item
  mapping(address => uint256[]) private ITEM_OWNERS; // mapping item owner to item ids


  /**
    * @dev Check if item exists
  */
  function _itemExists(uint256 _id) private view returns (bool) {
    if (ITEMS[_id].id != 0) {
      return true;
    }
    return false;
  }

  /**
    * @dev Does item exist
  */
  function _doesItemExist(uint256 _id) internal view returns (bool) {
    return _itemExists(_id);
  }

  /**
    * @dev Check if user is the owner
  */
  function _isSellerOwner(uint256 _id, address _owner) private view returns (bool) {
    if (ITEMS[_id].seller == _owner) {
      return true;
    }
    return false;
  }

  /**
    * @dev Does item exist
  */
  function _isSellerTheOwner(uint256 _id, address _owner) internal view returns (bool) {
    return _isSellerOwner(_id, _owner);
  }


  function __Item_init() internal {
  }


  /** 
    *****************************************************
    **************** Attribute Functions ****************
    *****************************************************
  */
  /**
    * @dev Get item id pointer
  */
  function _getItemIdPointer() internal view returns (uint256) {
    return ITEM_ID_POINTER.current();
  }

  /**```~```````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````````
    * @dev Reset item id pointer to 0
  */
  function _resetItemIdPointer() internal {
    ITEM_ID_POINTER.reset();
  }


  /** 
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Add empty item
  */
  function _addEmptyItem() internal {
    ITEM_ID_POINTER.increment();
    uint256 id = ITEM_ID_POINTER.current();
    ITEMS[id].id = id;
    _addItemId(id);
  }

  /**
    * @dev Add local item to put up for sale
  */
  function _addItem(
    uint256 _collectionId, uint256 _tokenId, address _contractAddress, address _seller, address _buyer, uint256 _price, uint8 _commission, address _creator
  ) internal returns (uint256) {
    require(_commission < 100, "Item: Commission percent must be < 100");

    ITEM_ID_POINTER.increment();
    uint256 id = ITEM_ID_POINTER.current();
    ITEMS[id] = ItemDS({
      id: id,
      collectionId: _collectionId,
      tokenId: _tokenId,
      contractAddress: _contractAddress,
      seller: _seller,
      buyer: _buyer,
      price: _price,
      commission: _commission,
      creator: _creator,
      sold: false,
      active: true
    });

    _addItemId(id);
    _addItemForOwner(_seller, id);
    return ITEM_ID_POINTER.current();
  }

  /**
    * @dev Get item
  */
  function _getItem(uint256 _id) internal view checkItem(_id) returns (ItemDS memory) {
    ItemDS memory item = ITEMS[_id];
    return item;
  }

  /**
    * @dev Get items
  */
  function _getItems(uint256[] memory _ids) internal view returns (ItemDS[] memory) {
    uint256 arrLength = _ids.length;
    ItemDS[] memory items = new ItemDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = _ids[i];
      ItemDS memory item = ITEMS[id];
      items[i] = item;
    }
    return items;
  }

  /**
    * @dev Get all items
  */
  function _getAllItems() internal view returns (ItemDS[] memory) {
    uint256 arrLength = ITEM_IDS.length;
    ItemDS[] memory items = new ItemDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = ITEM_IDS[i];
      ItemDS memory item = ITEMS[id];
      items[i] = item;
    }
    return items;
  }

  /**
    * @dev Update item
  */
  function _updateItem(
    uint256 _id, uint256 _collectionId, uint256 _tokenId, address _contractAddress, address _seller, address _buyer, uint256 _price,
    uint8 _commission, address _creator, bool _sold, bool _active
  ) internal checkItem(_id) {
    // todo do not allow to update _collectionId, _contractAddress, _creator
    require(_commission < 100, "Item: Commission percent must be < 100");

    ITEMS[_id] = ItemDS({
      id: _id,
      collectionId: _collectionId,
      tokenId: _tokenId,
      contractAddress: _contractAddress,
      seller: _seller,
      buyer: _buyer,
      price: _price,
      commission: _commission,
      creator: _creator,
      sold: _sold,
      active: _active
    });
    if (!_active) {
      _removeItemId(_id);
    }
  }

  /**
    * @dev Get item collection id
  */
  function _getItemCollectionId(uint256 _id) internal view checkItem(_id) returns (uint256) {
    return ITEMS[_id].collectionId;
  }

  /**
    * @dev Update item collection id
  */
  function _updateItemCollectionId(uint256 _id, uint256 _collectionId) internal checkItem(_id) {
    ITEMS[_id].collectionId = _collectionId;
  }

  /**
    * @dev Get item token id
  */
  function _getItemTokenId(uint256 _id) internal view checkItem(_id) returns (uint256) {
    return ITEMS[_id].tokenId;
  }

  /**
    * @dev Update item token id
  */
  function _updateItemTokenId(uint256 _id, uint256 _tokenId) internal checkItem(_id) {
    ITEMS[_id].tokenId = _tokenId;
  }

  /**
    * @dev Get item contract address
  */
  function _getItemContractAddress(uint256 _id) internal view checkItem(_id) returns (address) {
    return ITEMS[_id].contractAddress;
  }

  /**
    * @dev Update item contract address
  */
  function _updateItemContractAddress(uint256 _id, address _contractAddress) internal checkItem(_id) {
    ITEMS[_id].contractAddress = _contractAddress;
  }

  /**
    * @dev Get item seller
  */
  function _getItemSeller(uint256 _id) internal view checkItem(_id) returns (address) {
    return ITEMS[_id].seller;
  }

  /**
    * @dev Update item seller
  */
  function _updateItemSeller(uint256 _id, address _seller) internal checkItem(_id) {
    ITEMS[_id].seller = _seller;
  }

  /**
    * @dev Get item buyer
  */
  function _getItemBuyer(uint256 _id) internal view checkItem(_id) returns (address) {
    return ITEMS[_id].buyer;
  }

  /**
    * @dev Update item buyer
  */
  function _updateItemBuyer(uint256 _id, address _buyer) internal checkItem(_id) {
    ITEMS[_id].buyer = _buyer;
  }

  /**
    * @dev Get item price
  */
  function _getItemPrice(uint256 _id) internal view checkItem(_id) returns (uint256) {
    return ITEMS[_id].price;
  }

  /**
    * @dev Update item price
  */
  function _updateItemPrice(uint256 _id, uint256 _price) internal checkItem(_id) {
    ITEMS[_id].price = _price;
  }

  /**
    * @dev Get item commission
  */
  function _getItemCommission(uint256 _id) internal view checkItem(_id) returns (uint8) {
    return ITEMS[_id].commission;
  }

  /**
    * @dev Update item commission
  */
  function _updateItemCommission(uint256 _id, uint8 _commission) internal checkItem(_id) {
    ITEMS[_id].commission = _commission;
  }

  /**
    * @dev Get item creator
  */
  function _getItemCreator(uint256 _id) internal view checkItem(_id) returns (address) {
    return ITEMS[_id].creator;
  }

  /**
    * @dev Update item creator
  */
  function _updateItemCreator(uint256 _id, address _creator) internal checkItem(_id) {
    ITEMS[_id].creator = _creator;
  }

  /**
    * @dev Get item sold boolean
  */
  function _getItemSold(uint256 _id) internal view checkItem(_id) returns (bool) {
    return ITEMS[_id].sold;
  }

  /**
    * @dev Update item sold boolean
  */
  function _updateItemSold(uint256 _id, bool _sold) internal checkItem(_id) {
    ITEMS[_id].sold = _sold;
  }

  /**
    * @dev Get item active boolean
  */
  function _getItemActive(uint256 _id) internal view checkItem(_id) returns (bool) {
    return ITEMS[_id].active;
  }

  /**
    * @dev Update item active boolean
  */
  function _updateItemActive(uint256 _id, bool _active) internal checkItem(_id) {
    ITEMS[_id].active = _active;
  }

  /**
    * @dev Mark item as sold
  */
  function _markItemSold(uint256 _id) internal checkItem(_id) {
    _removeItemId(_id);
    _updateItemSold(_id, true);
  }

  /**
    * @dev Activate item
  */
  function _activateItem(uint256 _id) internal checkItem(_id) {
    _addItemId(_id);
    _updateItemActive(_id, true);
  }

  /**
    * @dev Deactivate item
  */
  function _deactivateItem(uint256 _id) internal checkItem(_id) {
    _removeItemId(_id);
    _updateItemActive(_id, false);
  }

  /**
    * @dev Remove item
  */
  function _removeItem(uint256 _id) internal checkItem(_id) {
    _removeItemId(_id);
    delete ITEMS[_id];
  }


  /** 
    *****************************************************
    ************* ITEM_IDS Functions ***************
    *****************************************************
  */
  /**
    * @dev Add a new item
  */
  function _addItemId(uint256 _id) internal {
    ITEM_IDS.push(_id);
  }

  /**
    * @dev Get item ids
  */
  function _getItemIds() internal view returns (uint256[] memory) {
    return ITEM_IDS;
  }

  /**
    * @dev Remove item id
  */
  function _removeItemId(uint256 _id) internal checkItem(_id) {
    uint256 arrLength = ITEM_IDS.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < ITEM_IDS.length; i++) {
      if (ITEM_IDS[i] != _id) {
        data[dataCounter] = ITEM_IDS[i];
        dataCounter++;
      }
    }
    ITEM_IDS = data;
  }


  /** 
    *****************************************************
    *********** ITEM_OWNERS Functions *************
    *****************************************************
  */
  /**
    * @dev Add a new owner (if necessary) and add item id passed in
  */
  function _addItemForOwner(address _owner, uint256 _id) internal {
    ITEM_OWNERS[_owner].push(_id);
  }

  /**
    * @dev Get items for owner
  */
  function _getItemsForOwner(address _owner) internal view returns (uint256[] memory) {
    return ITEM_OWNERS[_owner];
  }

  /**
    * @dev Remove a item for owner
  */
  function _removeItemForOwner(address _owner, uint256 _id) internal {
    uint256 arrLength = ITEM_OWNERS[_owner].length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < ITEM_OWNERS[_owner].length; i++) {
      if (ITEM_OWNERS[_owner][i] != _id) {
        data[dataCounter] = ITEM_OWNERS[_owner][i];
        dataCounter++;
      }
    }
    ITEM_OWNERS[_owner] = data;
  }

  /**
    * @dev Remove the item owner
  */
  function _removeItemOwner(address _owner) internal {
    delete ITEM_OWNERS[_owner];
  }

}
