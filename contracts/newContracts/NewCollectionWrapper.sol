// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

import '../AvaxTradeNft.sol';
import "./NewCollection.sol";

import "hardhat/console.sol";


contract NewCollectionWrapper is Initializable, UUPSUpgradeable, AccessControlUpgradeable, NewCollection {

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers

  // enums

  // data structures

  // state variables
  mapping(uint256 => bytes32) private COLLECTION_ROLES; // mapping collection id to collection role id

  // events
  event onActivation(uint256 indexed id, bool indexed active);
  event onCollectionUpdate(uint256 indexed id);
  event onCollectionRemove(uint256 indexed id);
  event onCollectionOwnerIncentiveAccess(uint256 indexed id);


  function initialize(address _admin) initializer public {
    // call parent classes
    __AccessControl_init();
    __Collection_init();

    // set up admin role
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

    // grant admin role to following accounts
    _setupRole(ADMIN_ROLE, _admin);

    // create collections
    createUnvariviedCollection();
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
    * @dev Create local collection
  */
  function localCollectionCreate(address _contractAddress) public onlyRole(ADMIN_ROLE) returns (uint256) {
    // todo ensure collection creater is the owner of the `_contractAddress`

    uint256 id = _createLocalCollection(_contractAddress, msg.sender);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], msg.sender);

    return id;
  }

  /**
    * @dev Create verified collection
  */
  function createVerifiedCollection(
    address _contractAddress, uint256 _totalSupply, uint8 _reflection, uint8 _commission, bool _ownerIncentiveAccess
  ) public returns (uint256) {
    // todo ensure collection creater is the owner of the `_contractAddress`

    uint256 id = _createVerifiedCollection(_contractAddress, _totalSupply, _reflection, _commission, msg.sender, _ownerIncentiveAccess);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], msg.sender);

    return id;
  }

  /**
    * @dev Create unvarivied collection
  */
  function createUnvariviedCollection() public onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = _createUnvariviedCollection(msg.sender);

    // create collection role
    bytes memory encodedId = abi.encodePacked(id);
    COLLECTION_ROLES[id] = keccak256(encodedId);
    _setRoleAdmin(COLLECTION_ROLES[id], ADMIN_ROLE);
    _setupRole(COLLECTION_ROLES[id], msg.sender);

    return id;
  }

  /**
    * @dev Update collection
  */
  function updateCollection(
    uint256 _id, uint8 _reflection, uint8 _commission, uint8 _incentive
  ) external onlyRole(COLLECTION_ROLES[_id]) {
    _updateCollection(_id, _reflection, _commission, _incentive, msg.sender);
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
    *****************************************************
    ************* Public Getter Functions ***************
    *****************************************************
  */


  /** 
    *****************************************************
    ************** Expose Child Functions ***************
    *****************************************************
  */

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
    * @dev Get owner of collection
  */
  function getOwnerOfCollection(uint256 _id) external view returns (address) {
    return _getCollectionOwner(_id);
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

}
