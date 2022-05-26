// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "hardhat/console.sol";


contract UserAccount {

  // modifiers
  modifier checkUserAccount(address _id) {
    require(_userAccountExists(_id), "The account for this user does not exist");
    _;
  }

  // data structures
  struct UserAccountDS {
    address id; // owner of these accounts
    uint256 general; // any general reward balance
    uint256 nftCommission; // commission reward balance from the item
    uint256 collectionCommission; // commission reward balance from the collection
  }

  mapping(address => UserAccountDS) private USER_ACCOUNTS; // mapping owner address to account object


  /**
    * @dev Check if user exists
  */
  function _userAccountExists(address _id) private view returns (bool) {
    if (USER_ACCOUNTS[_id].id != address(0)) {
      return true;
    }
    return false;
  }


  function __UserAccount_init() internal {
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
  function _addUserAccount(address _id) internal {
    USER_ACCOUNTS[_id].id = _id;
  }

  /**
    * @dev Get account of user
  */
  function _getUserAccount(address _id) internal view returns (UserAccountDS memory) {
    return USER_ACCOUNTS[_id];
  }

  /**
    * @dev Get accounts for list of users
  */
  function _getUserAccounts(address[] memory _ids) internal view returns (UserAccountDS[] memory) {
    uint256 arrLength = _ids.length;
    UserAccountDS[] memory accounts = new UserAccountDS[](arrLength);
    for (uint256 i = 0; i < arrLength; i++) {
      address id = _ids[i];
      require(_userAccountExists(id), "An account in the list does not exist");
      UserAccountDS memory account = USER_ACCOUNTS[id];
      accounts[i] = account;
    }
    return accounts;
  }

  /**
    * @dev Update account
  */
  function _updateUserAccount(
    address _id, uint256 _general, uint256 _nftCommission, uint256 _collectionCommission
  ) internal {
    USER_ACCOUNTS[_id] = UserAccountDS({
      id: _id,
      general: _general,
      nftCommission: _nftCommission,
      collectionCommission: _collectionCommission
    });
  }

  /**
    * @dev Increase account balance by given amounts
  */
  function _incrementUserAccount(
    address _id, uint256 _general, uint256 _nftCommission, uint256 _collectionCommission
  ) internal {
    USER_ACCOUNTS[_id] = UserAccountDS({
      id: _id,
      general: _getGeneralUserAccount(_id) + _general,
      nftCommission: _getNftCommissionUserAccount(_id) + _nftCommission,
      collectionCommission: _getCollectionCommissionUserAccount(_id) + _collectionCommission
    });
  }

  /**
    * @dev Get general account
  */
  function _getGeneralUserAccount(address _id) internal view returns (uint256) {
    return USER_ACCOUNTS[_id].general;
  }

  /**
    * @dev Update general account
  */
  function _updateGeneralUserAccount(address _id, uint256 _general) internal {
    USER_ACCOUNTS[_id].general = _general;
  }

  /**
    * @dev Get nft commission account
  */
  function _getNftCommissionUserAccount(address _id) internal view returns (uint256) {
    return USER_ACCOUNTS[_id].nftCommission;
  }

  /**
    * @dev Update nft commission account
  */
  function _updateNftCommissionUserAccount(address _id, uint256 _nftCommission) internal {
    USER_ACCOUNTS[_id].nftCommission = _nftCommission;
  }

  /**
    * @dev Get collection commission account
  */
  function _getCollectionCommissionUserAccount(address _id) internal view returns (uint256) {
    return USER_ACCOUNTS[_id].collectionCommission;
  }

  /**
    * @dev Update collection commission account
  */
  function _updateCollectionCommissionUserAccount(address _id, uint256 _collectionCommission) internal {
    USER_ACCOUNTS[_id].collectionCommission = _collectionCommission;
  }

  /**
    * @dev Nullify account
  */
  function _nullifyUserAccount(address _id) internal {
    _updateUserAccount(_id, 0, 0, 0);
  }

  /**
    * @dev Remove account
  */
  function _removeUserAccount(address _id) internal {
    delete USER_ACCOUNTS[_id];
  }
}
