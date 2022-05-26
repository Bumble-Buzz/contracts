// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";


contract Collection {
  using Counters for Counters.Counter;

  // modifiers
  modifier checkCollection(uint256 _id) {
    require(_collectionExists(_id), "The collection does not exist");
    _;
  }
  modifier onlyCollectionOwner(uint256 _id, address _owner) {
    require(_isCollectionOwner(_id, _owner), "User is not the owner of this collection");
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
  enum COLLECTION_TYPE { local, verified, unverified }

  // data structures
  struct CollectionDS {
    uint256 id; // unique collection id
    address contractAddress; // contract address of the collection
    uint256 totalSupply; // total supply of items in this collection
    uint8 reflection; // in percentage
    uint8 commission; // in percentage
    uint8 incentive; // in percentage
    address owner; // owner of the collection
    COLLECTION_TYPE collectionType; // type of the collection
    bool ownerIncentiveAccess; // whether owner of the collection can withdraw from incentive fund or not
    bool active;
  }
  struct CollectionIdDS {
    uint256[] active;
    uint256[] local;
    uint256[] verified;
    uint256[] unverified;
  }

  // state variables

  /**
    * @dev We use the same COLLECTION_ID_POINTER to track the size of the collection, and also
    * use it to know which index in the mapping we want to add the new collection.
    * Example:  if COLLECTION_ID_POINTER = 5
    *           We know there are 5 collections, but we also know in the mapping the
    *           collection id's are as follows: 0,1,2,3,4
    * So next time when we need to add a new collection, we use the same COLLECTION_ID_POINTER variable
    * to add collection in index '5', and then increment size +1 in end because now we have 6 collections
  */
  Counters.Counter private COLLECTION_ID_POINTER; // tracks total number of collections
  uint256 private MAX_COLLECTION_SIZE; // maximum number of collections allowed
  CollectionIdDS private COLLECTION_IDS; // Track important info for all collections
  mapping(uint256 => CollectionDS) private COLLECTIONS; // mapping collection id to collection

  mapping(address => uint256[]) private COLLECTION_OWNERS; // mapping collection owner to collection ids
  mapping(address => uint256) private COLLECTION_CONTRACTS; // mapping contract addresses to a collection id

  uint8 internal UNVERIFIED_COLLECTION_ID; // collection id `1` is always the unverified collection


  /**
    * @dev Check if item exists
  */
  function _collectionExists(uint256 _id) private view returns (bool) {
    if (COLLECTIONS[_id].id != 0) {
      return true;
    }
    return false;
  }

  /**
    * @dev Does collection exist
  */
  function _doesCollectionExist(uint256 _id) internal view returns (bool) {
    return _collectionExists(_id);
  }

  /**
    * @dev Check if item exists
  */
  function _isCollectionOwner(uint256 _id, address _owner) internal view returns (bool) {
    if (COLLECTIONS[_id].owner == _owner) {
      return true;
    }
    return false;
  }


  function __Collection_init() internal {
    // initialize state variables
    MAX_COLLECTION_SIZE = type(uint256).max;
    UNVERIFIED_COLLECTION_ID = 1;
  }


  /** 
    *****************************************************
    **************** Attribute Functions ****************
    *****************************************************
  */
  /**
    * @dev Get max collection size
  */
  function _getMaxCollectionSize() internal view returns (uint256) {
    return MAX_COLLECTION_SIZE;
  }

  /**
    * @dev Set max collection size
  */
  function _setMaxCollectionSize(uint256 _size) internal {
    MAX_COLLECTION_SIZE = _size;
  }

  /**
    * @dev Get collection id pointer
  */
  function _getCollectionIdPointer() internal view returns (uint256) {
    return COLLECTION_ID_POINTER.current();
  }

  /**
    * @dev Reset collection id pointer to 0
  */
  function _resetCollectionIdPointer() internal {
    COLLECTION_ID_POINTER.reset();
  }


  /** 
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Add empty collection
  */
  function _createEmptyCollection() internal {
    COLLECTION_ID_POINTER.increment();
    uint256 id = COLLECTION_ID_POINTER.current();
    COLLECTIONS[id].id = id;
    _addActiveCollectionId(id);
  }

  /**
    * @dev Create local collection
  */
  function _createLocalCollection(address _contractAddress, address _owner) internal returns (uint256) {
    require(_getCollectionForContract(_contractAddress) == 0, "Collection: Collection with this address already exists");

    COLLECTION_ID_POINTER.increment();
    uint256 id = COLLECTION_ID_POINTER.current();
    COLLECTIONS[id] = CollectionDS({
      id: id,
      contractAddress: _contractAddress,
      totalSupply: 0,
      reflection: 0,
      commission: 0,
      incentive: 0,
      owner: _owner,
      collectionType: COLLECTION_TYPE.local,
      ownerIncentiveAccess: false,
      active: true
    });

    _addActiveCollectionId(id);
    _addLocalCollectionId(id);
    _addCollectionForOwner(_owner, id);
    _assignContractToCollection(_contractAddress, id);
    return id;
  }

  /**
    * @dev Create verified collection
  */
  function _createVerifiedCollection(
    address _contractAddress, uint256 _totalSupply, uint8 _reflection, uint8 _commission,
    address _owner, bool _ownerIncentiveAccess
  ) internal returns (uint256) {
    require(_totalSupply > 0, "Collection: Total supply must be > 0");
    require(_reflection < 100, "Collection: Reflection percent must be < 100");
    require(_commission < 100, "Collection: Commission percent must be < 100");
    require(_getCollectionForContract(_contractAddress) == 0, "Collection: Collection with this address already exists");


    COLLECTION_ID_POINTER.increment();
    uint256 id = COLLECTION_ID_POINTER.current();
    COLLECTIONS[id] = CollectionDS({
      id: id,
      contractAddress: _contractAddress,
      totalSupply: _totalSupply,
      reflection: _reflection,
      commission: _commission,
      incentive: 0,
      owner: _owner,
      collectionType: COLLECTION_TYPE.verified,
      ownerIncentiveAccess: _ownerIncentiveAccess,
      active: false
    });

    _addVerifiedCollectionId(id);
    _addCollectionForOwner(_owner, id);
    _assignContractToCollection(_contractAddress, id);
    return id;
  }

  /**
    * @dev Create unvarivied collection
  */
  function _createUnvariviedCollection(address _owner) internal returns (uint256) {
    COLLECTION_ID_POINTER.increment();
    uint256 id = COLLECTION_ID_POINTER.current();
    COLLECTIONS[id] = CollectionDS({
      id: id,
      contractAddress: address(0),
      totalSupply: 0,
      reflection: 0,
      commission: 0,
      incentive: 0,
      owner: _owner,
      collectionType: COLLECTION_TYPE.unverified,
      ownerIncentiveAccess: false,
      active: true
    });

    _addActiveCollectionId(id);
    _addUnverifiedCollectionId(id);
    _addCollectionForOwner(_owner, id);
    _assignContractToCollection(address(0), id);
    return id;
  }

  /**
    * @dev Get collection
  */
  function _getCollection(uint256 _id) internal view checkCollection(_id) returns (CollectionDS memory) {
    CollectionDS memory collection = COLLECTIONS[_id];
    return collection;
  }

  /**
    * @dev Get active collections
  */
  function _getActiveCollections() internal view returns (CollectionDS[] memory) {
    uint256 arrLength = COLLECTION_IDS.active.length;
    CollectionDS[] memory collections = new CollectionDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = COLLECTION_IDS.active[i];
      CollectionDS memory collection = COLLECTIONS[id];
      collections[i] = collection;
    }
    return collections;
  }

  /**
    * @dev Get local collections
  */
  function _getLocalCollections() internal view returns (CollectionDS[] memory) {
    uint256 arrLength = COLLECTION_IDS.local.length;
    CollectionDS[] memory collections = new CollectionDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = COLLECTION_IDS.local[i];
      CollectionDS memory collection = COLLECTIONS[id];
      collections[i] = collection;
    }
    return collections;
  }

  /**
    * @dev Get verified collections
  */
  function _getVerifiedCollections() internal view returns (CollectionDS[] memory) {
    uint256 arrLength = COLLECTION_IDS.verified.length;
    CollectionDS[] memory collections = new CollectionDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = COLLECTION_IDS.verified[i];
      CollectionDS memory collection = COLLECTIONS[id];
      collections[i] = collection;
    }
    return collections;
  }

  /**
    * @dev Get vunerified collections
  */
  function _getUnverifiedCollections() internal view returns (CollectionDS[] memory) {
    uint256 arrLength = COLLECTION_IDS.unverified.length;
    CollectionDS[] memory collections = new CollectionDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      uint256 id = COLLECTION_IDS.unverified[i];
      CollectionDS memory collection = COLLECTIONS[id];
      collections[i] = collection;
    }
    return collections;
  }

  /**
    * @dev Update collection
  */
  function _updateCollection(
    uint256 _id, uint8 _reflection, uint8 _commission, uint8 _incentive, address _owner
  ) internal checkCollection(_id) {
    require(_reflection < 100, "Collection: Reflection percent must be < 100");
    require(_commission < 100, "Collection: Commission percent must be < 100");
    require(_incentive < 100, "Collection: Incentive percent must be < 100");

    COLLECTIONS[_id].reflection = _reflection;
    COLLECTIONS[_id].commission = _commission;
    COLLECTIONS[_id].incentive = _incentive;

    // if owner is different, add it to the list, delete the old one
    if (COLLECTIONS[_id].owner != _owner) {
      _removeCollectionForOwner(COLLECTIONS[_id].owner, _id);
      COLLECTIONS[_id].owner = _owner;
      _addCollectionForOwner(_owner, _id);
    }
  }

  /**
    * @dev Get collection contract address
  */
  function _getCollectionContractAddress(uint256 _id) internal view checkCollection(_id) returns (address) {
    return COLLECTIONS[_id].contractAddress;
  }

  /**
    * @dev Update collection contract address
  */
  function _updateCollectionContractAddress(uint256 _id, address _contractAddress) internal checkCollection(_id) {
    COLLECTIONS[_id].contractAddress = _contractAddress;
  }

  /**
    * @dev Get total supply
  */
  function _getCollectionTotalSupply(uint256 _id) internal view checkCollection(_id) returns (uint256) {
    return COLLECTIONS[_id].totalSupply;
  }

  /**
    * @dev Get collection reflection
  */
  function _getCollectionReflection(uint256 _id) internal view checkCollection(_id) returns (uint8) {
    return COLLECTIONS[_id].reflection;
  }

  /**
    * @dev Update collection reflection
  */
  function _updateCollectionReflection(uint256 _id, uint8 _reflection) internal checkCollection(_id) {
    COLLECTIONS[_id].reflection = _reflection;
  }

  /**
    * @dev Get collection commission
  */
  function _getCollectionCommission(uint256 _id) internal view checkCollection(_id) returns (uint8) {
    return COLLECTIONS[_id].commission;
  }

  /**
    * @dev Update collection commission
  */
  function _updateCollectionCommission(uint256 _id, uint8 _commission) internal checkCollection(_id) {
    COLLECTIONS[_id].commission = _commission;
  }

  /**
    * @dev Get collection incentive
  */
  function _getCollectionIncentive(uint256 _id) internal view checkCollection(_id) returns (uint8) {
    return COLLECTIONS[_id].incentive;
  }

  /**
    * @dev Update collection incentive
  */
  function _updateCollectionIncentive(uint256 _id, uint8 _incentive) internal checkCollection(_id) {
    COLLECTIONS[_id].incentive = _incentive;
  }

  /**
    * @dev Get collection owner
  */
  function _getCollectionOwner(uint256 _id) internal view checkCollection(_id) returns (address) {
    return COLLECTIONS[_id].owner;
  }

  /**
    * @dev Update collection owner
  */
  function _updateCollectionOwner(uint256 _id, address _owner) internal checkCollection(_id) {
    COLLECTIONS[_id].owner = _owner;
  }

  /**
    * @dev Get collection type
  */
  function _getCollectionType(uint256 _id) internal view checkCollection(_id) returns (COLLECTION_TYPE) {
    return COLLECTIONS[_id].collectionType;
  }

  /**
    * @dev Update collection type
  */
  function _updateCollectionType(uint256 _id, COLLECTION_TYPE _collectionType) internal checkCollection(_id) {
    COLLECTIONS[_id].collectionType = _collectionType;
  }

  /**
    * @dev Get collection ownerIncentiveAccess boolean
  */
  function _getCollectionOwnerIncentiveAccess(uint256 _id) internal view checkCollection(_id) returns (bool) {
    return COLLECTIONS[_id].ownerIncentiveAccess;
  }

  /**
    * @dev Update collectiton ownerIncentiveAccess boolean
  */
  function _updateCollectionOwnerIncentiveAccess(uint256 _id, bool _ownerIncentiveAccess) internal checkCollection(_id) {
    COLLECTIONS[_id].ownerIncentiveAccess = _ownerIncentiveAccess;
  }

  /**
    * @dev Get collection active boolean
  */
  function _getCollectionActive(uint256 _id) internal view checkCollection(_id) returns (bool) {
    return COLLECTIONS[_id].active;
  }

  /**
    * @dev Update collectiton active boolean
  */
  function _updateCollectionActive(uint256 _id, bool _active) internal checkCollection(_id) {
    COLLECTIONS[_id].active = _active;
  }

  /**
    * @dev Activate collection
  */
  function _activateCollection(uint256 _id) internal checkCollection(_id) {
    _addActiveCollectionId(_id);
    _updateCollectionActive(_id, true);
  }

  /**
    * @dev Deactivate collection
  */
  function _deactivateCollection(uint256 _id) internal checkCollection(_id) {
    _removeActiveCollectionId(_id);
    _updateCollectionActive(_id, false);
  }

  /**
    * @dev Remove collection
  */
  function _removeCollection(uint256 _id) checkCollection(_id) internal {
    _removeCollectionId(_id);
    _removeCollectionOwner(COLLECTIONS[_id].owner);
    _removeContractForCollection(COLLECTIONS[_id].contractAddress);
    delete COLLECTIONS[_id];
  }


  /** 
    *****************************************************
    ************* COLLECTION_IDS Functions **************
    *****************************************************
  */
  /**
    * @dev Add a new active collection
  */
  function _addActiveCollectionId(uint256 _id) internal {
    COLLECTION_IDS.active.push(_id);
  }

  /**
    * @dev Get active collection ids
  */
  function _getActiveCollectionIds() internal view returns (uint256[] memory) {
    return COLLECTION_IDS.active;
  }

  /**
    * @dev Remove a active collection
  */
  function _removeActiveCollectionId(uint256 _id) internal {
    COLLECTION_IDS.active = _removeSpecificCollectionId(_id, COLLECTION_IDS.active);
  }

  /**
    * @dev Add a new local collection
  */
  function _addLocalCollectionId(uint256 _id) internal {
    COLLECTION_IDS.local.push(_id);
  }

  /**
    * @dev Get local collection ids
  */
  function _getLocalCollectionIds() internal view returns (uint256[] memory) {
    return COLLECTION_IDS.local;
  }

  /**
    * @dev Add a new verified collection
  */
  function _addVerifiedCollectionId(uint256 _id) internal {
    COLLECTION_IDS.verified.push(_id);
  }

  /**
    * @dev Get verified collection ids
  */
  function _getVerifiedCollectionIds() internal view returns (uint256[] memory) {
    return COLLECTION_IDS.verified;
  }

  /**
    * @dev Add a new unverified collection
  */
  function _addUnverifiedCollectionId(uint256 _id) internal {
    COLLECTION_IDS.unverified.push(_id);
  }

  /**
    * @dev Get unverified collection ids
  */
  function _getUnverifiedCollectionIds() internal view returns (uint256[] memory) {
    return COLLECTION_IDS.unverified;
  }

  /**
    * @dev Get collection ids
  */
  function _getCollectionIds() internal view returns (CollectionIdDS memory) {
    return COLLECTION_IDS;
  }

  /**
    * @dev Remove collection id
  */
  function _removeCollectionId(uint256 _id) internal checkCollection(_id) {
    // COLLECTION_IDS.active = data;
    if (_getCollectionActive(_id)) {
      COLLECTION_IDS.active = _removeSpecificCollectionId(_id, COLLECTION_IDS.active);
    }

    // remove from collection type specific array
    COLLECTION_TYPE collectionType = COLLECTIONS[_id].collectionType;
    if (collectionType == COLLECTION_TYPE.local) {
      COLLECTION_IDS.local = _removeSpecificCollectionId(_id, COLLECTION_IDS.local);
    } else if (collectionType == COLLECTION_TYPE.verified) {
      COLLECTION_IDS.verified = _removeSpecificCollectionId(_id, COLLECTION_IDS.verified);
    } else if (collectionType == COLLECTION_TYPE.unverified) {
      COLLECTION_IDS.unverified = _removeSpecificCollectionId(_id, COLLECTION_IDS.unverified);
    }
  }

  /**
    * @dev Remove collection id for specific collection type
  */
  function _removeSpecificCollectionId(uint256 _id, uint256[] memory _collectionArray) private view checkCollection(_id) returns (uint256[] memory) {
    // remove from active collection array
    uint256 arrLength = _collectionArray.length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < _collectionArray.length; i++) {
      if (_collectionArray[i] != _id) {
        data[dataCounter] = _collectionArray[i];
        dataCounter++;
      }
    }
    return _collectionArray = data;
  }


  /** 
    *****************************************************
    *********** COLLECTION_OWNERS Functions *************
    *****************************************************
  */
  /**
    * @dev Add a new owner (if necessary) and add collection id passed in
  */
  function _addCollectionForOwner(address _owner, uint256 _id) internal {
    COLLECTION_OWNERS[_owner].push(_id);
  }

  /**
    * @dev Get collections for owner
  */
  function _getCollectionsForOwner(address _owner) internal view returns (uint256[] memory) {
    return COLLECTION_OWNERS[_owner];
  }

  /**
    * @dev Remove a collection for owner
  */
  function _removeCollectionForOwner(address _owner, uint256 _id) internal {
    uint256 arrLength = COLLECTION_OWNERS[_owner].length - 1;
    uint256[] memory data = new uint256[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < COLLECTION_OWNERS[_owner].length; i++) {
      if (COLLECTION_OWNERS[_owner][i] != _id) {
        data[dataCounter] = COLLECTION_OWNERS[_owner][i];
        dataCounter++;
      }
    }
    COLLECTION_OWNERS[_owner] = data;
  }

  /**
    * @dev Remove the collection owner
  */
  function _removeCollectionOwner(address _owner) internal {
    delete COLLECTION_OWNERS[_owner];
  }


  /** 
    *****************************************************
    *********** COLLECTION_CONTRACTS Functions *************
    *****************************************************
  */
  /**
    * @dev Assign a contract address to a collection
  */
  function _assignContractToCollection(address _contract, uint256 _id) internal {
    COLLECTION_CONTRACTS[_contract] = _id;
  }

  /**
    * @dev Get collection id for given contract address
  */
  function _getCollectionForContract(address _contract) internal view returns (uint256) {
    return COLLECTION_CONTRACTS[_contract];
  }

  /**
    * @dev Remove collection for given contract address
  */
  function _removeContractForCollection(address _contract) internal {
    delete COLLECTION_CONTRACTS[_contract];
  }

}
