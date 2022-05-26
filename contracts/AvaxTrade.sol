// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.12 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./collectionItem/CollectionItem.sol";
import "./bank/Bank.sol";
import "./sale/Sale.sol";

import "hardhat/console.sol";


contract AvaxTrade is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver {

  // Access Control
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  // modifiers
  modifier checkContractValidity(address _contractAddress) {
    require(_isContractAddressValid(_contractAddress), "Provided contract address is not valid");
    _;
  }

  // enums
  enum SALE_TYPE { direct, immediate, auction }

  // data structures
  struct BalanceSheetDS {
    uint256 totalFunds; // total funds in contract before deductions
    uint256 marketplaceRevenue; // outstanding marketplace revenue balance
    uint256 nftCommission; // outstanding nft commission reward balance
    uint256 collectionReflection; // outstanding collection reflection reward balance
    uint256 collectionCommission; // outstanding collection commission reward balance
    uint256 collectionIncentive;  // outstanding collection incentive reward balance
    uint256 incentiveVault; // outstanding incentive vault balance
    uint256 availableFunds; // total funds in contract after deductions
  }

  struct ContractsDS {
    address bank; // address for the bank contract
    address sale; // address for the sale contract
    address collectionItem; // address for the collectionItem contract
  }

  // state variables
  uint256 private LISTING_PRICE; // price to list item in marketplace
  uint8 private MARKETPLACE_COMMISSION; // commission rate charged upon every sale, in percentage
  uint8 private MARKETPLACE_INCENTIVE_COMMISSION; // commission rate rewarded upon every sale, in percentage
  address private MARKETPLACE_BANK_OWNER; // user who has access to withdraw marketplace commission

  ContractsDS private CONTRACTS;

  // monetary
  BalanceSheetDS private BALANCE_SHEET;

  // events
  event onERC721ReceivedEvent(address operator, address from, uint256 tokenId, bytes data);
  event onCollectionCreate(address indexed owner, address indexed contractAddress, string collectionType, uint256 id);
  event onCreateMarketSale(uint256 indexed itemId, uint256 indexed tokenId, address indexed contractAddress, address seller, SALE_TYPE saleType);
  event onCancelMarketSale(uint256 indexed itemId, uint256 indexed tokenId, address indexed contractAddress, address seller);
  event onCompleteMarketSale(uint256 indexed itemId, uint256 indexed tokenId, address indexed contractAddress, address buyer, uint256 saleProfit);
  event onClaimRewards(address indexed user, uint256 indexed reward, string rewardType);
  event onDepositMarketplaceIncentive(address indexed user, uint256 indexed amount);
  event onDepositCollectionIncentive(address indexed user, address indexed contractAddress, uint256 indexed amount);
  event onWithdrawCollectionIncentive(address indexed user, address indexed contractAddress, uint256 indexed amount);
  event onDistributeRewardInCollection(uint256 indexed collectionId, uint256 indexed amount);


  function initialize(address _owner) initializer public {
    // call parent classes
    __AccessControl_init();
    __ReentrancyGuard_init();

    // initialize state variables
    LISTING_PRICE = 0.0 ether;
    MARKETPLACE_COMMISSION = 2;
    MARKETPLACE_INCENTIVE_COMMISSION = 0;
    MARKETPLACE_BANK_OWNER = _owner;

    BALANCE_SHEET = BalanceSheetDS(0, 0, 0, 0, 0, 0, 0, 0);

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
    **************** Private Functions ******************
    *****************************************************
  */
  /**
    * @dev Is contract address valid ERC721 or ERC1155
  */
  function _isContractAddressValid(address _contractAddress) private view returns (bool) {
    if (IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId)) {
      return true;
    }
    return false;
  }

  /**
    * @dev Calculate percent change
  */
  function _calculatePercentChange(uint256 _value, uint8 _percent) private pure returns (uint256) {
    return (_value * _percent / 100);
  }


  /** 
    *****************************************************
    **************** Attribute Functions ****************
    *****************************************************
  */
  /**
    * @dev Get list of contract address of sibling contracts
  */
  function getContracts() public view returns (ContractsDS memory) {
    return CONTRACTS;
  }
  /**
    * @dev Set list of contract address of sibling contracts
  */
  function setContracts(address _bank, address _sale, address _collectionItem) public onlyRole(ADMIN_ROLE) {
    if (_bank != address(0)) {
      CONTRACTS.bank = _bank;
    }
    if (_sale != address(0)) {
      CONTRACTS.sale = _sale;
    }
    if (_collectionItem != address(0)) {
      CONTRACTS.collectionItem = _collectionItem;
    }
  }

  /**
    * @dev Get marketplace listing price
  */
  function getMarketplaceListingPrice() public view returns (uint256) {
    return LISTING_PRICE;
  }
  /**
    * @dev Set marketplace listing price
  */
  function setMarketplaceListingPrice(uint256 _listingPrice) public onlyRole(ADMIN_ROLE) {
    LISTING_PRICE = _listingPrice;
  }

  /**
    * @dev Get marketplace commission
  */
  function getMarketplaceCommission() public view returns (uint8) {
    return MARKETPLACE_COMMISSION;
  }
  /**
    * @dev Set marketplace commission
  */
  function setMarketplaceCommission(uint8 _commission) public onlyRole(ADMIN_ROLE) {
    MARKETPLACE_COMMISSION = _commission;
  }

  /**
    * @dev Get marketplace incentive commission
  */
  function getMarketplaceIncentiveCommission() public view returns (uint8) {
    return MARKETPLACE_INCENTIVE_COMMISSION;
  }
  /**
    * @dev Set marketplace incentive commission
  */
  function setMarketplaceIncentiveCommission(uint8 _commission) public onlyRole(ADMIN_ROLE) {
    MARKETPLACE_INCENTIVE_COMMISSION = _commission;
  }

  /**
    * @dev Get marketplace bank owner
  */
  function getMarketplaceBankOwner() public view returns (address) {
    return MARKETPLACE_BANK_OWNER;
  }
  /**
    * @dev Set marketplace bank owner
  */
  function setMarketplaceBankOwner(address _owner) public onlyRole(ADMIN_ROLE) {
    MARKETPLACE_BANK_OWNER = _owner;
  }


  /** 
    *****************************************************
    ****************** Main Functions *******************
    *****************************************************
  */
  /**
    * @dev Create market sale
  */
  function createMarketSale(
    uint256 _tokenId, address _contractAddress, address _buyer, uint256 _price, SALE_TYPE _saleType
  ) external nonReentrant() payable {
    // ensure listing price is met
    require(msg.value >= LISTING_PRICE, 'Not enough funds to create sale');
    if (_saleType != SALE_TYPE.direct) {
      require(_price > 0, 'Buy price must be greater than 0');
    }

    address buyer = address(0);
    if (_saleType == SALE_TYPE.direct) {
      buyer = _buyer; // only use passed in buyer param when it is a direct sale
    }
    uint256 itemId = CollectionItem(CONTRACTS.collectionItem).addItemToCollection(
      _tokenId,
      _contractAddress,
      msg.sender,
      buyer,
      _price
    );

    if (_saleType == SALE_TYPE.direct) {
      Sale(CONTRACTS.sale).createSaleDirect(itemId, msg.sender);
    } else if (_saleType == SALE_TYPE.immediate) {
      Sale(CONTRACTS.sale).createSaleImmediate(itemId, msg.sender);
    } else if (_saleType == SALE_TYPE.auction) {
      Sale(CONTRACTS.sale).createSaleAuction(itemId, msg.sender);
    } else {
      revert("Incorrect sale type");
    }

    if (IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId)) {
      // ownerOf(_tokenId) == msg.sender then continue, else revert transaction
      require(IERC721(_contractAddress).ownerOf(_tokenId) == msg.sender, "You are not the owner of this item");

      // transfer nft to market place
      IERC721(_contractAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
    } else {
      revert("Provided contract address is not valid");
    }

    emit onCreateMarketSale(itemId, _tokenId, _contractAddress, msg.sender, _saleType);
  }

  /**
    * @dev Cancel market item from sale
  */
  function cancelMarketSale(uint256 _itemId) external nonReentrant() {
    Item.ItemDS memory item = CollectionItem(CONTRACTS.collectionItem).getItem(_itemId);
    require(!item.sold, "This item has already been sold");
    require(item.active, "This item is inactive");
    require(msg.sender == item.seller, "You are not the original owner of this item");

    CollectionItem(CONTRACTS.collectionItem).cancelItemInCollection(_itemId);
    Sale(CONTRACTS.sale)._removeSale(_itemId, msg.sender);

    // transfer nft to original owner
    IERC721(item.contractAddress).safeTransferFrom(address(this), msg.sender, item.tokenId);

    emit onCancelMarketSale(_itemId, item.tokenId, item.contractAddress, msg.sender);
  }

  /**
    * @dev Remove market item from sale. For a varified collection
  */
  function completeMarketSale(uint256 _itemId) external nonReentrant() payable {
    Item.ItemDS memory item = CollectionItem(CONTRACTS.collectionItem).getItem(_itemId);
    require(!item.sold, "This item has already been sold");
    require(item.active, "This item is inactive");
    require(msg.value >= item.price, "Not enough funds to purchase this item");
    require(msg.sender != item.seller, "You can not buy your own item");

    uint256 saleProfit = 0;
    if (Sale(CONTRACTS.sale).isDirectSaleValid(_itemId, item.seller)) {
      // directMarketSale(item, msg.sender, msg.value);
      require(msg.sender == item.buyer, "You are not the authorized buyer");
      saleProfit = _completeSale(item, msg.sender, msg.value);
    } else if (Sale(CONTRACTS.sale).isImmediateSaleValid(_itemId, item.seller)) {
      saleProfit = _completeSale(item, msg.sender, msg.value);
    } else if (Sale(CONTRACTS.sale).isAuctionSaleValid(_itemId, item.seller)) {
      saleProfit = _completeSale(item, msg.sender, msg.value);
    } else {
      revert("Invalid sale type");
    }

    emit onCompleteMarketSale(_itemId, item.tokenId, item.contractAddress, msg.sender, saleProfit);
  }

  /**
    * @dev Complete sale
  */
  function _completeSale(Item.ItemDS memory item, address _buyer, uint256 _price) private returns (uint256) {
    // todo Test: Unverified item on sale. Then item is now verified but still listed on sale. What happens?

    Collection.CollectionDS memory collection = CollectionItem(CONTRACTS.collectionItem).getCollection(item.collectionId);

    CollectionItem(CONTRACTS.collectionItem).markItemSoldInCollection(item.id, _buyer);
    Sale(CONTRACTS.sale)._removeSale(item.id, item.seller);

    // deduct marketplace 2% commission
    _price = marketplaceCommission(_price, MARKETPLACE_COMMISSION);

    Collection.COLLECTION_TYPE collectionType = collection.collectionType;
    if (collectionType == Collection.COLLECTION_TYPE.local) {
      console.log('local');

      // deduct nft commission, if applicable
      _price = nftCommission(_price, item.commission, item.creator);

    } else if (collectionType == Collection.COLLECTION_TYPE.verified) {
      console.log('verified');

      // deduct collection reflection rewards, if applicable
      _price = collectionReflection(_price, collection.reflection, collection.contractAddress, collection.totalSupply);

      // deduct collection commission rewards, if applicable
      _price = collectionCommission(_price, collection.commission, collection.owner);

      // add collection incentive rewards, if applicable
      _price = collectionIncentive(_price, collection.incentive, collection.contractAddress);

    } else if (collectionType == Collection.COLLECTION_TYPE.unverified) {
      console.log('unverified');
    } else {
      revert("Invalid collection type");
    }
    
    // add marketplace incentive rewards, if applicable
    _price = marketplaceIncentive(_price, MARKETPLACE_INCENTIVE_COMMISSION);

    // transfer funds to seller
    Bank(CONTRACTS.bank).incrementUserAccount(item.seller, _price, 0, 0);

    // transfer nft to market place
    IERC721(item.contractAddress).safeTransferFrom(address(this), _buyer, item.tokenId);

    return _price;
  }


  /** 
    *****************************************************
    ***************** Reward Functions ******************
    *****************************************************
  */
  /**
    * @dev Deduct marketplace commission
    * @custom:type private
  */
  function marketplaceCommission(uint256 _value, uint8 _percent) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    _value -= reward;
    Bank(CONTRACTS.bank).incrementUserAccount(MARKETPLACE_BANK_OWNER, reward, 0, 0);
    BALANCE_SHEET.marketplaceRevenue += reward;
    return _value;
  }

  /**
    * @dev Deduct nft commission
    * @custom:type private
  */
  function nftCommission(uint256 _value, uint8 _percent, address _creator) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    if (reward > 0) {
      _value -= reward;
      Bank(CONTRACTS.bank).incrementUserAccount(_creator, 0, reward, 0);
      BALANCE_SHEET.nftCommission += reward;
    }
    return _value;
  }

  /**
    * @dev Deduct collection reflection
    * @custom:type private
  */
  function collectionReflection(uint256 _value, uint8 _percent, address _contractAddress, uint256 _totalSupply) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    if (reward > 0) {
      _value -= reward;
      Bank(CONTRACTS.bank).distributeCollectionReflectionReward(_contractAddress, _totalSupply, reward);
      BALANCE_SHEET.collectionReflection += reward;
    }
    return _value;
  }

  /**
    * @dev Deduct collection commission
    * @custom:type private
  */
  function collectionCommission(uint256 _value, uint8 _percent, address _collectionOwner) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    if (reward > 0) {
      _value -= reward;
      Bank(CONTRACTS.bank).incrementUserAccount(_collectionOwner, 0, 0, reward);
      BALANCE_SHEET.collectionCommission += reward;
    }
    return _value;
  }

  /**
    * @dev Give collection incentives
    * @custom:type private
  */
  function collectionIncentive(uint256 _value, uint8 _percent, address _contractAddress) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    if (reward > 0) {
      uint256 collectionIncentiveVault = Bank(CONTRACTS.bank).getIncentiveVaultCollectionAccount(_contractAddress);
      if (collectionIncentiveVault >= reward) {
        _value += reward;
        Bank(CONTRACTS.bank).updateCollectionIncentiveReward(_contractAddress, reward, false);
        BALANCE_SHEET.collectionIncentive -= reward;
      } else {
        _value += collectionIncentiveVault;
        Bank(CONTRACTS.bank).nullifyCollectionIncentiveReward(_contractAddress);
        BALANCE_SHEET.collectionIncentive = 0;
      }
    }
    return _value;
  }

  /**
    * @dev Give marketplace incentives
    * @custom:type private
  */
  function marketplaceIncentive(uint256 _value, uint8 _percent) private returns (uint256) {
    uint256 reward = _calculatePercentChange(_value, _percent);
    if (reward > 0) {
      if (BALANCE_SHEET.incentiveVault >= reward) {
        _value += reward;
        BALANCE_SHEET.incentiveVault -= reward;
      } else {
        _value += BALANCE_SHEET.incentiveVault;
        BALANCE_SHEET.incentiveVault = 0;
      }
    }
    return _value;
  }


  /** 
    *****************************************************
    ***************** Claim Functions *******************
    *****************************************************
  */
  /**
    * @dev Claim account general reward for this user
  */
  function claimGeneralRewardUserAccount() external nonReentrant() returns (uint256) {
    uint256 reward = Bank(CONTRACTS.bank).claimGeneralRewardUserAccount(msg.sender);

    // todo ensure this is a safe way to transfer funds
    ( bool success, ) = payable(msg.sender).call{ value: reward }("");
    require(success, "General reward transfer to user was unccessfull");
    emit onClaimRewards(msg.sender, reward, 'general');
    return reward;
  }

  /**
    * @dev Claim account nft commission reward for this user
  */
  function claimNftCommissionRewardUserAccount() external nonReentrant() returns (uint256) {
    uint256 reward = Bank(CONTRACTS.bank).claimNftCommissionRewardUserAccount(msg.sender);

    // todo ensure this is a safe way to transfer funds
    ( bool success, ) = payable(msg.sender).call{ value: reward }("");
    require(success, "Nft commission reward transfer to user was unccessfull");
    emit onClaimRewards(msg.sender, reward, 'nft_commission');
    return reward;
  }

  /**
    * @dev Claim account collection commission reward for this user
  */
  function claimCollectionCommissionRewardUserAccount() external nonReentrant() returns (uint256) {
    uint256 reward = Bank(CONTRACTS.bank).claimCollectionCommissionRewardUserAccount(msg.sender);

    // todo ensure this is a safe way to transfer funds
    ( bool success, ) = payable(msg.sender).call{ value: reward }("");
    require(success, "Collection commission reward transfer to user was unccessfull");
    emit onClaimRewards(msg.sender, reward, 'collection_commission');
    return reward;
  }

  /**
    * @dev Claim collection reflection reward for this token id
  */
  function claimReflectionRewardCollectionAccount(uint256 _tokenId, address _contractAddress) external nonReentrant() returns (uint256) {
    uint256 reward = Bank(CONTRACTS.bank).claimReflectionRewardCollectionAccount(_tokenId, _contractAddress);

    if (IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId)) {
      // ownerOf(_tokenId) == msg.sender then continue, else revert transaction
      require(IERC721(_contractAddress).ownerOf(_tokenId) == msg.sender, "You are not the owner of this item");

      // todo ensure this is a safe way to transfer funds
      ( bool success, ) = payable(msg.sender).call{ value: reward }("");
      require(success, "Collection commission reward transfer to user was unccessfull");
    } else {
      revert("Provided contract address is not valid");
    }
    emit onClaimRewards(msg.sender, reward, 'collection_reflection');
    return reward;
  }

  /**
    * @dev Claim collection reflection reward for list of token ids
  */
  function claimReflectionRewardListCollectionAccount(uint256[] memory _tokenIds, address _contractAddress) external nonReentrant() returns (uint256) {
    uint256 reward = Bank(CONTRACTS.bank).claimReflectionRewardListCollectionAccount(_tokenIds, _contractAddress);

    if (IERC721(_contractAddress).supportsInterface(type(IERC721).interfaceId)) {
      for (uint256 i = 0; i < _tokenIds.length; i++) {
        // ownerOf(_tokenId) == msg.sender then continue, else revert transaction
        require(IERC721(_contractAddress).ownerOf(_tokenIds[i]) == msg.sender, "You are not the owner of one of the items");
      }

      // todo ensure this is a safe way to transfer funds
      ( bool success, ) = payable(msg.sender).call{ value: reward }("");
      require(success, "Collection commission reward transfer to user was unccessfull");
    } else {
      revert("Provided contract address is not valid");
    }
    emit onClaimRewards(msg.sender, reward, 'collection_reflection');
    return reward;
  }


  /** 
    *****************************************************
    **************** Monetary Functions *****************
    *****************************************************
  */
  /**
    * @dev Deposit into collection incentive vault
  */
  function depositIncentiveCollectionAccount(address _contractAddress) external nonReentrant() payable {
    /**
      * todo
      * why check if person depositing funds is the owner of the collection?
      * Allow anyone to deposit money, in any account? 
    */
    Bank(CONTRACTS.bank).updateCollectionIncentiveReward(_contractAddress, msg.value, true);
    BALANCE_SHEET.collectionIncentive += msg.value;
    emit onDepositCollectionIncentive(msg.sender, _contractAddress, msg.value);
  }

  /**
    * @dev Withdraw from collection incentive vault
  */
  function withdrawIncentiveCollectionAccount(address _contractAddress, uint256 _amount) external nonReentrant() {
    uint256 collectionId = CollectionItem(CONTRACTS.collectionItem).getCollectionForContract(_contractAddress);
    Collection.CollectionDS memory collection = CollectionItem(CONTRACTS.collectionItem).getCollection(collectionId);
    // address collectionOwner = CollectionItem(CONTRACTS.collectionItem).getOwnerOfCollection(collectionId);

    require(collection.owner == msg.sender, "You are not the owner of this collection");
    require(collection.ownerIncentiveAccess == true, "You do not have access to withdraw");

    Bank(CONTRACTS.bank).updateCollectionIncentiveReward(_contractAddress, _amount, false);
    BALANCE_SHEET.collectionIncentive -= _amount;

    // todo ensure this is a safe way to transfer funds
    ( bool success, ) = payable(msg.sender).call{ value: _amount }("");
    require(success, "Collection commission reward transfer to user was unccessfull");
    emit onWithdrawCollectionIncentive(msg.sender, _contractAddress, _amount);
  }

  /**
    * @dev Distrubute reward among all NFT holders in a given collection
  */
  function distributeRewardInCollection(uint256 _collectionId) external nonReentrant() payable {
    Collection.CollectionDS memory collection = CollectionItem(CONTRACTS.collectionItem).getCollection(_collectionId);
    require(collection.collectionType == Collection.COLLECTION_TYPE.verified, "Not a verified collection");

    Bank(CONTRACTS.bank).distributeCollectionReflectionReward(collection.contractAddress, collection.totalSupply, msg.value);
    BALANCE_SHEET.collectionReflection += msg.value;
    emit onDistributeRewardInCollection(_collectionId, msg.value);
  }

  /**
    * @dev Distrubute reward among given NFT holders in a given collection
  */
  function distributeRewardListInCollection(uint256 _collectionId, uint256[] memory _tokenIds) external nonReentrant() payable {
    Collection.CollectionDS memory collection = CollectionItem(CONTRACTS.collectionItem).getCollection(_collectionId);
    require(collection.collectionType == Collection.COLLECTION_TYPE.verified, "Not a verified collection");
    require(_tokenIds.length > 0, "Token id list must be greater than 0");
    require(_tokenIds.length <= collection.totalSupply, "Token id list must not exceed size of collection total supply");

    Bank(CONTRACTS.bank).distributeCollectionReflectionRewardList(collection.contractAddress, _tokenIds, msg.value);
    BALANCE_SHEET.collectionReflection += msg.value;
    emit onDistributeRewardInCollection(_collectionId, msg.value);
  }

  /**
    * @dev Deposit into marketplace incentive vault
  */
  function depositMarketplaceIncentiveVault() external nonReentrant() payable {
    BALANCE_SHEET.incentiveVault += msg.value;
    emit onDepositMarketplaceIncentive(msg.sender, msg.value);
  }


  /** 
    *****************************************************
    *************** Collection Functions ****************
    *****************************************************
  */
  /**
    * @dev Create local collection
  */
  function createLocalCollection(address _contractAddress) external onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = CollectionItem(CONTRACTS.collectionItem).localCollectionCreate(_contractAddress, msg.sender);
    Bank(CONTRACTS.bank).addBank(msg.sender); // this is okay even if bank account already exists

    emit onCollectionCreate(msg.sender, _contractAddress, "local", id);
    return id;
  }

  /**
    * @dev Create verified collection
  */
  function createVerifiedCollection(
    address _contractAddress, uint256 _totalSupply, uint8 _reflection, uint8 _commission,
    address _owner, bool _ownerIncentiveAccess
  ) external returns (uint256) {
    uint256 id = CollectionItem(CONTRACTS.collectionItem).createVerifiedCollection(
      _contractAddress, _totalSupply, _reflection, _commission, _owner, _ownerIncentiveAccess
    );
    Bank(CONTRACTS.bank).addBank(_contractAddress); // this is okay even if bank account already exists
    Bank(CONTRACTS.bank).initReflectionVaultCollectionAccount(_contractAddress, _totalSupply);

    emit onCollectionCreate(msg.sender, _contractAddress, "verified", id);
    return id;
  }

  /**
    * @dev Create unvarivied collection
  */
  function createUnvariviedCollection() external onlyRole(ADMIN_ROLE) returns (uint256) {
    uint256 id = CollectionItem(CONTRACTS.collectionItem).createUnvariviedCollection(msg.sender);
    Bank(CONTRACTS.bank).addBank(msg.sender); // this is okay even if bank account already exists

    emit onCollectionCreate(msg.sender, address(0), "unvarivied", id);
    return id;
  }


  /** 
    *****************************************************
    ***************** Public Functions ******************
    *****************************************************
  */
  /**
    * @dev Version of implementation contract
  */
  function version() external pure virtual returns (string memory) {
      return 'v1';
  }
  /**
    * @dev Get contract balance sheet
  */
  function getBalanceSheet() external view returns (BalanceSheetDS memory) {
    return BALANCE_SHEET;
  }


  /** 
    *****************************************************
    ************** Expose Child Functions ***************
    *****************************************************
  */
  function getImplementation() external view returns (address) {
      return _getImplementation();
  }
  function getAdmin() external view returns (address) {
      return _getAdmin();
  }
  function getBeacon() external view returns (address) {
      return _getBeacon();
  }


  /** 
    *****************************************************
    ************** Nft Transfter Functions **************
    *****************************************************
  */
  function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes calldata _data
  ) external override returns (bytes4) {
    emit onERC721ReceivedEvent(_operator, _from, _tokenId, _data);
    return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

}
