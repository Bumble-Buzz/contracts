// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';

import "./UserAccount.sol";
import "./CollectionAccount.sol";
import "./Vault.sol";

import "hardhat/console.sol";


contract Bank is Initializable, UUPSUpgradeable, AccessControlUpgradeable, UserAccount, CollectionAccount, Vault {

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers
  modifier checkBank(address _id) {
    require(_bankExists(_id), "The bank for this user does not exist");
    _;
  }

  // data structures
  struct BankDS {
    address id; // owner of this bank account
    UserAccountDS user; // user account
    CollectionAccountReturnDS collection; // collection account
    VaultDS vault; // bank vault
  }

  address[] private BANK_OWNERS; // current list of bank holders


  /**
    * @dev Check if bank exists
  */
  function _bankExists(address _id) private view returns (bool) {
    for (uint256 i = 0; i < BANK_OWNERS.length; i++) {
      if (BANK_OWNERS[i] == _id) {
        return true;
      }
    }
    return false;
  }


  function initialize(address _owner) initializer public {
    // call parent classes
    __AccessControl_init();

    // set up admin role
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

    // grant admin role to following account (parent contract)
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
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Add bank
  */
  function addBank(address _id) public onlyRole(ADMIN_ROLE) {
    if (isBankOwnerUnique(_id)) {
      _addBankOwner(_id);
      _addUserAccount(_id);
      _addCollectionAccount(_id);
      _addVault(_id);
    }
  }

  /**
    * @dev Get bank for given user
  */
  function getBank(address _id) public view returns (BankDS memory) {
    BankDS memory bank = BankDS({
      id: _id,
      user: _getUserAccount(_id),
      collection: _getCollectionAccount(_id),
      vault: _getVault(_id)
    });
    return bank;
  }

  /**
    * @dev Get banks for list of users
  */
  function getBanks(address[] memory _ids) public view returns (BankDS[] memory) {
    uint256 arrLength = _ids.length;
    BankDS[] memory banks = new BankDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      address id = _ids[i];
      // ensure bank id is valid. If not, kill transaction
      require(_bankExists(id), "A user in the list does not own a bank");
      BankDS memory bank = BankDS({
        id: id,
        user: _getUserAccount(id),
        collection: _getCollectionAccount(id),
        vault: _getVault(id)
      });
      banks[i] = bank;
    }
    return banks;
  }

  /**
    * @dev Update bank 
  */
  function updateBank(
    address _id, uint256 _general, uint256 _nftCommission, uint256 _collectionCommission,
    uint256[] memory _reflectionVault, uint256 _incentiveVault, uint256 _balance
  ) public onlyRole(ADMIN_ROLE) {
    _updateUserAccount(_id, _general, _nftCommission, _collectionCommission);
    _updateCollectionAccount(_id, _reflectionVault, _incentiveVault);
    _updateVault(_id, _balance);
  }

  /**
    * @dev Nullify bank
    * @custom:type private
  */
  function _nullifyBank(address _id) public {
    _nullifyUserAccount(_id);
    _nullifyCollectionAccount(_id);
    _nullifyVault(_id);
  }

  /**
    * @dev Remove bank
    * @custom:type private
  */
  function _removeBank(address _id) public {
    _removeBankOwner(_id);
    _removeUserAccount(_id);
    _removeCollectionAccount(_id);
    _removeVault(_id);
  }


  /** 
    *****************************************************
    **************** Monetary Functions *****************
    *****************************************************
  */

  /**
    * @dev Increase account balance by given amounts
  */
  function incrementUserAccount(
    address _id, uint256 _general, uint256 _nftCommission, uint256 _collectionCommission
  ) external onlyRole(ADMIN_ROLE) {
    addBank(_id); // create if bank account does not exist
    _incrementUserAccount(_id, _general, _nftCommission, _collectionCommission);
  }

  /**
    * @dev Increase collection balance by given amounts
  */
  function incrementCollectionAccount(
    address _id, uint256 _rewardPerItem, uint256 _incentiveVault
  ) external onlyRole(ADMIN_ROLE) {
    addBank(_id); // create if bank account does not exist
    _incrementCollectionAccount(_id, _rewardPerItem, _incentiveVault);
  }

  /**
    * @dev Claim account general reward for this user
  */
  function claimGeneralRewardUserAccount(address _owner) external onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 reward = _getGeneralUserAccount(_owner);
    _updateGeneralUserAccount(_owner, 0);
    return reward;
  }

  /**
    * @dev Claim account nft commission reward for this user
  */
  function claimNftCommissionRewardUserAccount(address _owner) external onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 reward = _getNftCommissionUserAccount(_owner);
    _updateNftCommissionUserAccount(_owner, 0);
    return reward;
  }

  /**
    * @dev Claim account collection commission reward for this user
  */
  function claimCollectionCommissionRewardUserAccount(address _owner) external onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 reward = _getCollectionCommissionUserAccount(_owner);
    _updateCollectionCommissionUserAccount(_owner, 0);
    return reward;
  }

  /**
    * @dev Claim collection reflection reward for this token id
  */
  function claimReflectionRewardCollectionAccount(uint256 _tokenId, address _contractAddress) external onlyRole(ADMIN_ROLE) returns (uint256) {
    require(_tokenId > 0, "Bank: Invalid token id provided");

    uint256 reward = _getReflectionVaultIndexCollectionAccount(_contractAddress, _tokenId);
    _updateReflectionVaultIndexCollectionAccount(_contractAddress, _tokenId, 0);
    return reward;
  }

  /**
    * @dev Claim collection reflection reward for list of token ids
  */
  function claimReflectionRewardListCollectionAccount(uint256[] memory _tokenIds, address _contractAddress) external onlyRole(ADMIN_ROLE) returns (uint256) {
    require(_tokenIds.length > 0, "Bank: Token id list is empty");

    uint256 reward = 0;
    for (uint256 i = 0; i < _tokenIds.length; i++) {
      require(_tokenIds[i] > 0, "Bank: Invalid token id provided");
      reward += _getReflectionVaultIndexCollectionAccount(_contractAddress, _tokenIds[i]);
      _updateReflectionVaultIndexCollectionAccount(_contractAddress, _tokenIds[i], 0);
    }
    return reward;
  }

  /**
    * @dev Distribute collection reflection reward between all token id's
  */
  function distributeCollectionReflectionReward(address _contractAddress, uint256 _totalSupply, uint256 _reflectionReward) external onlyRole(ADMIN_ROLE) {
    addBank(_contractAddress); // create if bank account does not exist
    uint256 reflectionRewardPerItem = _reflectionReward / _totalSupply;
    _increaseReflectionVaultCollectionAccount(_contractAddress, reflectionRewardPerItem);
  }

  /**
    * @dev Distribute collection reflection reward between given token id's
  */
  function distributeCollectionReflectionRewardList(address _contractAddress, uint256[] memory _tokenIds, uint256 _reflectionReward) external onlyRole(ADMIN_ROLE) {
    addBank(_contractAddress); // create if bank account does not exist
    uint256 reflectionRewardPerItem = _reflectionReward / _tokenIds.length;
    for (uint256 i = 0; i < _tokenIds.length; i++) {
      _increaseReflectionVaultForTokensCollectionAccount(_contractAddress, _tokenIds[i], reflectionRewardPerItem);
    }
  }

  /**
    * @dev Update collection incentive reward
  */
  function updateCollectionIncentiveReward(address _contractAddress, uint256 _value, bool _increase) external onlyRole(ADMIN_ROLE) returns (uint256) {
    addBank(_contractAddress); // create if bank account does not exist
    uint256 incentiveVault = _getIncentiveVaultCollectionAccount(_contractAddress);
    if (_increase) {
      uint256 newIncentiveVault = incentiveVault + _value;
      _updateIncentiveVaultCollectionAccount(_contractAddress, newIncentiveVault);
    } else {
      require(incentiveVault >= _value, "Bank: Withdraw amount must be less than or equal to vault balance");
      uint256 newIncentiveVault = incentiveVault - _value;
      _updateIncentiveVaultCollectionAccount(_contractAddress, newIncentiveVault);
    }

    return _getIncentiveVaultCollectionAccount(_contractAddress);
  }

  /**
    * @dev Nullify collection incentive reward
  */
  function nullifyCollectionIncentiveReward(address _contractAddress) external onlyRole(ADMIN_ROLE) returns (uint256) {
    addBank(_contractAddress); // create if bank account does not exist
    _updateIncentiveVaultCollectionAccount(_contractAddress, 0);

    return _getIncentiveVaultCollectionAccount(_contractAddress);
  }


  /** 
    *****************************************************
    ************** BANK_OWNERS Functions ****************
    *****************************************************
  */
  /**
    * @dev Add bank owner
    * @custom:type private
  */
  function _addBankOwner(address _id) public {
    BANK_OWNERS.push(_id);
  }

  /**
    * @dev Get bank owners
  */
  function getBankOwners() public view returns (address[] memory) {
    return BANK_OWNERS;
  }

  /**
    * @dev Does bank owner already exist in the mapping?
  */
  function isBankOwnerUnique(address _id) public view returns (bool) {
    for (uint256 i = 0; i < BANK_OWNERS.length; i++) {
      if (BANK_OWNERS[i] == _id) {
        return false;
      }
    }
    return true;
  }

  /**
    * @dev Remove bank owner
    * @custom:type private
  */
  function _removeBankOwner(address _id) public {
    uint256 arrLength = BANK_OWNERS.length - 1;
    address[] memory data = new address[](arrLength);
    uint8 dataCounter = 0;
    for (uint256 i = 0; i < BANK_OWNERS.length; i++) {
      if (BANK_OWNERS[i] != _id) {
        data[dataCounter] = BANK_OWNERS[i];
        dataCounter++;
      }
    }
    BANK_OWNERS = data;
  }


  /** 
    *****************************************************
    ************** Expose Child Functions ***************
    *****************************************************
  */

  // UserAccount.sol
  /**
    * @dev Get account of user
  */
  function getUserAccount(address _id) external view returns (UserAccountDS memory) {
    return _getUserAccount(_id);
  }
  /**
    * @dev Get accounts for list of users
  */
  function getUserAccounts(address[] memory _ids) external view returns (UserAccountDS[] memory) {
    return _getUserAccounts(_ids);
  }

  /**
    * @dev Get general user account
  */
  function getGeneralUserAccount(address _id) external view returns (uint256) {
    return _getGeneralUserAccount(_id);
  }

  /**
    * @dev Get nft commission user account
  */
  function getNftCommissionUserAccount(address _id) external view returns (uint256) {
    return _getNftCommissionUserAccount(_id);
  }

  /**
    * @dev Get collection commission user account
  */
  function getCollectionCommissionUserAccount(address _id) external view returns (uint256) {
    return _getCollectionCommissionUserAccount(_id);
  }

  // CollectionAccount.sol
  /**
    * @dev Initialize a collection reflection vault for the given collection
  */
  function initReflectionVaultCollectionAccount(address _id, uint256 _totalSupply) external onlyRole(ADMIN_ROLE) {
    addBank(_id); // create if bank account does not exist
    return _initReflectionVaultCollectionAccount(_id, _totalSupply);
  }

  /**
    * @dev Get account of collection
  */
  function getCollectionAccount(address _id) external view returns (CollectionAccountReturnDS memory) {
    return _getCollectionAccount(_id);
  }

  /**
    * @dev Get collections for list of users
  */
  function getCollectionAccounts(address[] memory _ids) external view returns (CollectionAccountReturnDS[] memory) {
    return _getCollectionAccounts(_ids);
  }

  /**
    * @dev Get collection reflection vault
  */
  function getReflectionVaultCollectionAccount(address _id) external view returns (uint256[] memory) {
    return _getReflectionVaultCollectionAccount(_id);
  }

  /**
    * @dev Get collection reflection reward for this token id
  */
  function getReflectionRewardCollectionAccount(uint256 _tokenId, address _contractAddress) external view returns (uint256) {
    return _getReflectionVaultIndexCollectionAccount(_contractAddress, _tokenId);
  }

  /**
    * @dev Get collection incentive vault
  */
  function getIncentiveVaultCollectionAccount(address _id) external view returns (uint256) {
    return _getIncentiveVaultCollectionAccount(_id);
  }

  // Vault.sol
  /**
    * @dev Get vault of user
  */
  function getVault(address _id) external view returns (VaultDS memory) {
    return _getVault(_id);
  }
}
