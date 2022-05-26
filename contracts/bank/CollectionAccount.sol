// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "hardhat/console.sol";


contract CollectionAccount {

  // modifiers
  modifier checkCollectionAccount(address _id) {
    require(_collectionAccountExists(_id), "The account for this collection does not exist");
    _;
  }
  modifier isCollectionAccountInitialized(address _id) {
    require(COLLECTION_ACCOUNTS[_id].supply > 0, "Collection account not initialized");
    _;
  }

  // data structures
  struct CollectionAccountDS {
    address id; // contract address of this collection account
    mapping(uint256 => uint256) reflectionVault; // reflection reward for each token id
    uint256 incentiveVault; // collection reward vault given upon completion of market sale
    uint256 supply; // total supply of this collection
  }
  struct CollectionAccountReturnDS {
    address id; // contract address of this collection account
    string reflectionVault; // reflection reward for each token id
    uint256 incentiveVault; // collection reward vault given upon completion of market sale
    uint256 supply; // total supply of this collection
  }

  mapping(address => CollectionAccountDS) private COLLECTION_ACCOUNTS; // mapping owner address to collection object


  /**
    * @dev Check if user exists
  */
  function _collectionAccountExists(address _id) private view returns (bool) {
    if (COLLECTION_ACCOUNTS[_id].id != address(0)) {
      return true;
    }
    return false;
  }


  function __CollectionAccount_init() internal {
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
    * @dev Add account
  */
  function _addCollectionAccount(address _id) internal {
    COLLECTION_ACCOUNTS[_id].id = _id;
  }

  /**
    * @dev Get account of collection
  */
  function _getCollectionAccount(address _id) internal view returns (CollectionAccountReturnDS memory) {
    return CollectionAccountReturnDS({
      id: COLLECTION_ACCOUNTS[_id].id,
      reflectionVault: 'reflectionVault',
      incentiveVault: COLLECTION_ACCOUNTS[_id].incentiveVault,
      supply: COLLECTION_ACCOUNTS[_id].supply
    });
  }

  /**
    * @dev Get collections for list of users
  */
  function _getCollectionAccounts(address[] memory _ids) internal view returns (CollectionAccountReturnDS[] memory) {
    uint256 arrLength = _ids.length;
    CollectionAccountReturnDS[] memory collections = new CollectionAccountReturnDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      address id = _ids[i];
      require(_collectionAccountExists(id), "An account in the list does not exist");
      CollectionAccountReturnDS memory collection = CollectionAccountReturnDS({
        id: COLLECTION_ACCOUNTS[id].id,
        reflectionVault: 'reflectionVault',
        incentiveVault: COLLECTION_ACCOUNTS[id].incentiveVault,
        supply: COLLECTION_ACCOUNTS[id].supply
      });
      collections[i] = collection;
    }
    return collections;
  }

  /**
    * @dev Initialize a collection reflection vault for the given collection
  */
  function _initReflectionVaultCollectionAccount(address _id, uint256 _supply) internal {
    require(_supply > 0, "CollectionAccount: Total supply must be > 0");
    COLLECTION_ACCOUNTS[_id].supply = _supply;
  }

  /**
    * @dev Update collection
  */
  function _updateCollectionAccount(
    address _id, uint256[] memory _reflectionVaultArray, uint256 _incentiveVault
  ) internal isCollectionAccountInitialized(_id) {
    COLLECTION_ACCOUNTS[_id].id = _id;
    for (uint256 i = 0; i < _reflectionVaultArray.length; i++) {
      COLLECTION_ACCOUNTS[_id].reflectionVault[i+1] = _reflectionVaultArray[i];
    }
    COLLECTION_ACCOUNTS[_id].incentiveVault = _incentiveVault;
  }

  /**
    * @dev Get collection reflection vault
  */
  function _getReflectionVaultCollectionAccount(address _id) internal view returns (uint256[] memory) {
    uint256[] memory reflectionVaultArray = new uint256[](COLLECTION_ACCOUNTS[_id].supply);
    for (uint i = 0; i < COLLECTION_ACCOUNTS[_id].supply; i++) {
        reflectionVaultArray[i] = COLLECTION_ACCOUNTS[_id].reflectionVault[i+1];
    }
    return reflectionVaultArray;
  }

  /**
    * @dev Increase collection reflection vault
      @param _id : collection id
      @param _rewardPerItem : reward needs to be allocated to each item in this collection
  */
  function _increaseReflectionVaultCollectionAccount(address _id, uint256 _rewardPerItem) internal isCollectionAccountInitialized(_id) {
    for (uint256 i = 1; i <= COLLECTION_ACCOUNTS[_id].supply; i++) {
      uint256 currentValue = COLLECTION_ACCOUNTS[_id].reflectionVault[i];
      COLLECTION_ACCOUNTS[_id].reflectionVault[i] = currentValue + _rewardPerItem;
    }
  }

  /**
    * @dev Increase collection reflection vault for given token
    * todo write test for this
  */
  function _increaseReflectionVaultForTokensCollectionAccount(address _id, uint256  _tokenId, uint256 _rewardPerItem) internal isCollectionAccountInitialized(_id) {
    require(_tokenId > 0, "Token id must be greater than 0");
    COLLECTION_ACCOUNTS[_id].reflectionVault[_tokenId] += _rewardPerItem;
  }

  /**
    * @dev Get collection reflection for given token id
  */
  function _getReflectionVaultIndexCollectionAccount(address _id, uint256 _tokenId) internal view returns (uint256) {
    return COLLECTION_ACCOUNTS[_id].reflectionVault[_tokenId];
  }

  /**
    * @dev Update collection reflection for given token id
      @param _id : collection id
      @param _tokenId : specific token id to update
      @param _newVal : new value for a single token id
  */
  function _updateReflectionVaultIndexCollectionAccount(address _id, uint256 _tokenId, uint256 _newVal) internal isCollectionAccountInitialized(_id) {
    require(_tokenId > 0, "Token id must be greater than 0");
    COLLECTION_ACCOUNTS[_id].reflectionVault[_tokenId] = _newVal;
  }
  /**
    * @dev Nullify all collection reflection rewards for the given collection id
  */
  function _nullifyReflectionVaultCollectionAccount(address _id) internal isCollectionAccountInitialized(_id) {
    for (uint256 i = 1; i <= COLLECTION_ACCOUNTS[_id].supply; i++) {
      COLLECTION_ACCOUNTS[_id].reflectionVault[i] = 0;
    }
  }

  /**
    * @dev Get collection incentive vault
  */
  function _getIncentiveVaultCollectionAccount(address _id) internal view returns (uint256) {
    return COLLECTION_ACCOUNTS[_id].incentiveVault;
  }

  /**
    * @dev Update collection incentive vault
  */
  function _updateIncentiveVaultCollectionAccount(address _id, uint256 _incentiveVault) internal {
    COLLECTION_ACCOUNTS[_id].incentiveVault = _incentiveVault;
  }

  /**
    * @dev Increase collection balance by given amounts
  */
  function _incrementCollectionAccount(
    address _id, uint256 _rewardPerItem, uint256 _incentiveVault
  ) internal {
    _increaseReflectionVaultCollectionAccount(_id, _rewardPerItem);
    COLLECTION_ACCOUNTS[_id].incentiveVault += _incentiveVault;
  }

  /**
    * @dev Nullify collection
  */
  function _nullifyCollectionAccount(address _id) internal {
    _nullifyReflectionVaultCollectionAccount(_id);
    _updateIncentiveVaultCollectionAccount(_id, 0);
  }

  /**
    * @dev Remove collection
  */
  function _removeCollectionAccount(address _id) internal {
    delete COLLECTION_ACCOUNTS[_id];
  }
}
