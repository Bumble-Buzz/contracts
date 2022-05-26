// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

import '../AvaxTradeNft.sol';
import "./Collection.sol";
import "./Item.sol";

import "hardhat/console.sol";


contract CollectionItem is Initializable, UUPSUpgradeable, AccessControlUpgradeable, Collection, Item {

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers
  modifier checkCollectionItem(uint256 _id) {
    require(_collectionItemExists(_id), "The collection item does not exist");
    _;
  }
  modifier checkCollectionItemId(uint256 _id, uint256 _itemId) {
    require(_collectionItemIdExists(_id, _itemId), "The collection item id does not exist");
    _;
  }

  // enums

  // data structures

  // state variables
  mapping(uint256 => uint256[]) private COLLECTION_ITEMS; // mapping collection id to list of item ids
  mapping(uint256 => bytes32) private COLLECTION_ROLES; // mapping collection id to collection role id

  // events
  event onActivation(uint256 indexed id, bool indexed active);
  event onCollectionUpdate(uint256 indexed id);
  event onCollectionRemove(uint256 indexed id);
  event onCollectionOwnerIncentiveAccess(uint256 indexed id);


  /**
    * @dev Check if collection item exists
  */
  function _collectionItemExists(uint256 _id) private view returns (bool) {
    if (COLLECTION_ITEMS[_id].length > 0) {
      return true;
    }
    return false;
  }

  /**
    * @dev Check if collection item id exists
    * todo is this redundant? do we really need this check?
  */
  function _collectionItemIdExists(uint256 _id, uint256 _itemId) private view returns (bool) {
    uint256[] memory  collectionItem = COLLECTION_ITEMS[_id];
    for (uint256 i = 0; i < collectionItem.length; i++) {
      if (collectionItem[i] == _itemId) {
        return true;
      }
    }
    return false;
  }

  /**
    * @dev Calculate percent change
  */
  function _calculatePercentChange(uint256 _value, uint8 _percent) private pure returns (uint256) {
    return (_value * _percent / 100);
  }


  function initialize(address _owner, address _admin) initializer public {
    // call parent classes
    __AccessControl_init();
    __Collection_init();
    __Item_init();

    // todo create 2 roles, instead of one
    //      ADMIN_ROLE = Admin (owner of AvaxTrade contract)
    //      OWNER_ROLE = AvaxTrade contract

    // set up admin role
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

    // grant admin role to following accounts
    _setupRole(ADMIN_ROLE, _owner);
    _setupRole(ADMIN_ROLE, _admin);

    // create collections
    createUnvariviedCollection(_admin);
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
    * @dev Add item to collection
  */
  function addItemToCollection(
    uint256 _tokenId, address _contractAddress, address _seller, address _buyer, uint256 _price
  ) public onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 collectionId = _getCollectionForContract(_contractAddress);
    if (collectionId == 0 || (collectionId > 0 && !_getCollectionActive(collectionId))) {
      // this means this is an unvarified item, so we will use the unvarified collection
      collectionId = UNVERIFIED_COLLECTION_ID;
    }

    uint8 commission = 0;
    address creator = address(0);
    COLLECTION_TYPE collectionType = _getCollectionType(collectionId);
    if (collectionType == COLLECTION_TYPE.local) {
      (creator, commission) = AvaxTradeNft(_contractAddress).getNftInfo(_tokenId);
    }

    uint256 itemId = _addItem(
                        collectionId,
                        _tokenId,
                        _contractAddress,
                        _seller,
                        _buyer,
                        _price,
                        commission,
                        creator
                      );
    _addItemIdInCollection(collectionId, itemId);
    return itemId;
  }

  /**
    * @dev Cancel item that is currently on sale
  */
  function cancelItemInCollection(uint256 _itemId) public onlyRole(ADMIN_ROLE){
    uint256 collectionId = _getItemCollectionId(_itemId);
    require(_collectionItemIdExists(collectionId, _itemId), "Collection or item does not exist");

    _deactivateItem(_itemId);
    _removeItemIdInCollection(collectionId, _itemId);
  }

  /**
    * @dev Mark item sold in collection
  */
  function markItemSoldInCollection(uint256 _itemId, address _buyer) public onlyRole(ADMIN_ROLE) {
    uint256 collectionId = _getItemCollectionId(_itemId);
    require(_collectionItemIdExists(collectionId, _itemId), "Collection or item does not exist");

    _markItemSold(_itemId);
    _updateItemBuyer(_itemId, _buyer);
    _removeItemIdInCollection(collectionId, _itemId);
  }

  /**
    * @dev Create local collection
  */
  function localCollectionCreate(address _contractAddress, address _owner) public onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = _createLocalCollection(_contractAddress, _owner);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], _owner);

    return id;
  }

  /**
    * @dev Create verified collection
  */
  function createVerifiedCollection(
    address _contractAddress, uint256 _totalSupply, uint8 _reflection, uint8 _commission,
    address _owner, bool _ownerIncentiveAccess
  ) public onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = _createVerifiedCollection(_contractAddress, _totalSupply, _reflection, _commission, _owner, _ownerIncentiveAccess);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], _owner);

    return id;
  }

  /**
    * @dev Create unvarivied collection
  */
  function createUnvariviedCollection(address _owner) public onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = _createUnvariviedCollection(_owner);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], _owner);

    return id;
  }

  /**
    * @dev Update collection
  */
  function updateCollection(
    uint256 _id, uint8 _reflection, uint8 _commission,
    uint8 _incentive, address _owner
  ) external onlyRole(COLLECTION_ROLES[_id]) {
    _updateCollection(_id, _reflection, _commission, _incentive, _owner);
    emit onCollectionUpdate(_id);
  }

  /**
    * @dev Disable owner access to collectiton incentive pool
  */
  function disableCollectionOwnerIncentiveAccess(uint256 _id) external onlyRole(COLLECTION_ROLES[_id]) {
    _updateCollectionOwnerIncentiveAccess(_id, false);
    emit onCollectionOwnerIncentiveAccess(_id);
  }

  /**
    * @dev Activate collection
  */
  function activateCollection(uint256 _id) external onlyRole(ADMIN_ROLE) {
    _activateCollection(_id);
    emit onActivation(_id, _getCollectionActive(_id));
  }

  /**
    * @dev Deactivate collection
  */
  function deactivateCollection(uint256 _id) external onlyRole(ADMIN_ROLE) {
    _deactivateCollection(_id);
    emit onActivation(_id, _getCollectionActive(_id));
  }

  /**
    * @dev Remove collection
  */
  function removeCollection(uint256 _id) external onlyRole(ADMIN_ROLE) {
    _removeCollection(_id);
    emit onCollectionRemove(_id);
  }

  /**
    * @dev Deactivate item
  */
  function activateItem(uint256 _itemId) external onlyRole(ADMIN_ROLE) {
    return _activateItem(_itemId);
  }

  /**
    * @dev Activate item
  */
  function deactivateItem(uint256 _itemId) external onlyRole(ADMIN_ROLE) {
    return _deactivateItem(_itemId);
  }


  /** 
    *****************************************************
    *********** COLLECTION_ITEMS Functions *************
    *****************************************************
  */
  /**
    * @dev Add a new collection id (if necessary) and add item id to the array
    * @custom:type private
  */
  function _addItemIdInCollection(uint256 _id, uint256 _itemId) public {
    COLLECTION_ITEMS[_id].push(_itemId);
  }

  /**
    * @dev Get item ids for the given collection
  */
  function getItemIdsInCollection(uint256 _id) public view returns (uint256[] memory) {
    return COLLECTION_ITEMS[_id];
  }

  /**
    * @dev Remove an item in collection
    * @custom:type private
  */
  function _removeItemIdInCollection(uint256 _id, uint256 _itemId) public {
    uint256 arrLength = COLLECTION_ITEMS[_id].length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < COLLECTION_ITEMS[_id].length; i++) {
      if (COLLECTION_ITEMS[_id][i] != _itemId) {
        data[dataCounter] = COLLECTION_ITEMS[_id][i];
        dataCounter++;
      }
    }
    COLLECTION_ITEMS[_id] = data;
  }

  /**
    * @dev Remove the collection item
    * @custom:type private
  */
  function _removeCollectionItem(uint256 _id) public {
    delete COLLECTION_ITEMS[_id];
  }


  /** 
    *****************************************************
    ************* Public Getter Functions ***************
    *****************************************************
  */

  /**
    * @dev Get item id given token id and contract address
  */
  function getItemId(uint256 _tokenId, address _contractAddress, address _owner) public view returns (uint256) {
    uint256[] memory itemIds = _getItemsForOwner(_owner);
    uint256 itemId = 0;
    for (uint256 i = 0; i < itemIds.length; i++) {
      if (_getItemTokenId(itemIds[i]) == _tokenId && _getItemContractAddress(itemIds[i]) == _contractAddress) {
        itemId = itemIds[i];
      }
    }
    require(_doesItemExist(itemId), "The item does not exist");
    require(_isSellerTheOwner(itemId, _owner), "This user is not the owner of the item");
    return itemId;
  }

  /**
    * @dev Get item id given token id and contract address
  */
  function getItemOfOwner(uint256 _tokenId, address _contractAddress, address _owner) public view returns (ItemDS memory) {
    uint256 itemId = getItemId(_tokenId, _contractAddress, _owner);
    return _getItem(itemId);
  }

  /**
    * @dev Get all item ids in collection
  */
  function getItemsInCollection(uint256 _id) public view checkCollection(_id) returns (ItemDS[] memory) {
    uint256[] memory itemsIds = getItemIdsInCollection(_id);
    return _getItems(itemsIds);
  }

  /**
    * @dev Get owner of collection
  */
  function getOwnerOfCollection(uint256 _id) public view checkCollection(_id) returns (address) {
    return _getCollectionOwner(_id);
  }

  /**
    * @dev Get owner of collection for this item
  */
  function getOwnerOfItemCollection(uint256 _itemId) public view returns (address) {
    uint256 collectionId = _getItemCollectionId(_itemId);
    _doesCollectionExist(collectionId);
    require(_collectionItemIdExists(collectionId, _itemId), "Collection or item does not exist");

    return _getCollectionOwner(collectionId);
  }

  /**
    * @dev Get creator of this item
  */
  function getCreatorOfItem(uint256 _itemId) public view checkItem(_itemId) returns (address) {
    return _getItemCreator(_itemId);
  }


  /** 
    *****************************************************
    ************** Expose Child Functions ***************
    *****************************************************
  */

  // Collection.sol
  /**
    * @dev Get collection
  */
  function getCollection(uint256 _id) external view returns (CollectionDS memory) {
    return _getCollection(_id);
  }

  /**
    * @dev Get collection
  */
  function getCollectionType(uint256 _id) external view returns (COLLECTION_TYPE) {
    return _getCollectionType(_id);
  }

  /**
    * @dev Get collection
  */
  function getCollectionIncentive(uint256 _id) external view returns (uint8) {
    return _getCollectionIncentive(_id);
  }

  /**
    * @dev Get collection commission
  */
  function getCollectionCommission(uint256 _id) external view returns (uint8) {
    return _getCollectionCommission(_id);
  }

  /**
    * @dev Get collection reflection
  */
  function getCollectionReflection(uint256 _id) external view returns (uint8) {
    return _getCollectionReflection(_id);
  }

  /**
    * @dev Get active collection ids
  */
  function getActiveCollectionIds() external view returns (uint256[] memory) {
    return _getActiveCollectionIds();
  }

  /**
    * @dev Get local collection ids
  */
  function getLocalCollectionIds() external view returns (uint256[] memory) {
    return _getLocalCollectionIds();
  }

  /**
    * @dev Get verified collection ids
  */
  function getVerifiedCollectionIds() external view returns (uint256[] memory) {
    return _getVerifiedCollectionIds();
  }

  /**
    * @dev Get unverified collection ids
  */
  function getUnverifiedCollectionIds() external view returns (uint256[] memory) {
    return _getUnverifiedCollectionIds();
  }

  /**
    * @dev Get collection ids
  */
  function getCollectionIds() external view returns (CollectionIdDS memory) {
    return _getCollectionIds();
  }

  /**
    * @dev Get collections for owner
  */
  function getCollectionsForOwner(address _owner) external view returns (uint256[] memory) {
    return _getCollectionsForOwner(_owner);
  }

  /**
    * @dev Get collection id for given contract address
  */
  function getCollectionForContract(address _contract) external view returns (uint256) {
    return _getCollectionForContract(_contract);
  }


  // Item.sol
  /**
    * @dev Get item
  */
  function getItem(uint256 _itemId) external view returns (ItemDS memory) {
    return _getItem(_itemId);
  }

  /**
    * @dev Get items
  */
  function getItems(uint256[] memory _itemIds) external view returns (ItemDS[] memory) {
    return _getItems(_itemIds);
  }

  /**
    * @dev Get all items
  */
  function getAllItems() external view returns (ItemDS[] memory) {
    return _getAllItems();
  }

  /**
    * @dev Get items for owner
  */
  function getItemsForOwner() external view returns (uint256[] memory) {
    return _getItemsForOwner(msg.sender);
  }

  /**
    * @dev Get item commission
  */
  function getItemCommission(uint256 _itemId) external view returns (uint8) { 
    return _getItemCommission(_itemId);
  }

  /**
    * @dev Get item collection id
  */
  function getItemCollectionId(uint256 _itemId) external view returns (uint256) { 
    return _getItemCollectionId(_itemId);
  }

}
