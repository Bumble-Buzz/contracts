const _ = require('lodash');
const { assert, expect } = require('chai');
require('chai').use(require('chai-as-promised')).should();
const { ethers, upgrades } = require("hardhat");

// global variables
let ACCOUNTS = [];
let CONTRACT;
let BANK_CONTRACT;
let SALE_CONTRACT;
let COLLECTION_ITEM_CONTRACT;
let NFT_CONTRACT;
let NFT_CONTRACT_1155;
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

// global functions
const _doesArrayInclude = (_array, _identifier = {}) => {
  const foundDna = _array.find((arrayElement) => {
      return _.isEqual(arrayElement, _identifier);
  });
  return foundDna == undefined ? false : true;
};
const _doesArrayEqual = (_array, expectedArray = []) => {
  return _(_array).differenceWith(expectedArray, _.isEqual).isEmpty();
};

describe("AvaxTrade - Main", () => {
  before(async () => {
    ACCOUNTS = await ethers.getSigners();
  });

  beforeEach(async () => {
    let contractFactory = await ethers.getContractFactory("AvaxTrade");
    // CONTRACT = await contractFactory.deploy();
    CONTRACT = await upgrades.deployProxy(contractFactory, [ACCOUNTS[0].address], { kind: 'uups' });
    await CONTRACT.deployed();

    // upgrade - all tests passed with this turned on
    // contractFactory = await ethers.getContractFactory("AvaxTrade2");
    // await upgrades.upgradeProxy(CONTRACT, contractFactory);

    // set up Bank contract
    contractFactory = await ethers.getContractFactory("Bank");
    // BANK_CONTRACT = await contractFactory.deploy(CONTRACT.address);
    BANK_CONTRACT = await upgrades.deployProxy(contractFactory, [CONTRACT.address], { kind: 'uups' });
    await BANK_CONTRACT.deployed();

    // set up Sale contract
    contractFactory = await ethers.getContractFactory("Sale");
    // SALE_CONTRACT = await contractFactory.deploy(CONTRACT.address, ACCOUNTS[0].address);
    SALE_CONTRACT = await upgrades.deployProxy(contractFactory, [CONTRACT.address, ACCOUNTS[0].address], { kind: 'uups' });
    await SALE_CONTRACT.deployed();

    // set up CollectionItem contract
    contractFactory = await ethers.getContractFactory("CollectionItem");
    // COLLECTION_ITEM_CONTRACT = await contractFactory.deploy(CONTRACT.address, ACCOUNTS[0].address);
    COLLECTION_ITEM_CONTRACT = await upgrades.deployProxy(contractFactory, [CONTRACT.address, ACCOUNTS[0].address], { kind: 'uups' });
    await COLLECTION_ITEM_CONTRACT.deployed();

    // update AvaxTrade with sibling contracts
    await CONTRACT.connect(ACCOUNTS[0]).setContracts(BANK_CONTRACT.address, SALE_CONTRACT.address, COLLECTION_ITEM_CONTRACT.address);

    // set up Bank, Sale, and CollectionItem contracts
    // const contracts = await CONTRACT.connect(ACCOUNTS[4]).getContracts();
    // BANK_CONTRACT = await ethers.getContractAt("Bank", contracts.bank);
    // SALE_CONTRACT = await ethers.getContractAt("Sale", contracts.sale);
    // COLLECTION_ITEM_CONTRACT = await ethers.getContractAt("CollectionItem", contracts.collectionItem);

    // set up AvaxTrade NFT 721 contract
    // contractFactory = await ethers.getContractFactory("AvaxTradeNft");
    // NFT_CONTRACT = await contractFactory.deploy('Local AvaxTrade', 'LAX', 'ipfs://');
    // await NFT_CONTRACT.deployed();

    // await NFT_CONTRACT.connect(ACCOUNTS[4]).mint(ACCOUNTS[4].address, 1, { value: ethers.utils.parseEther('0.50') });
    // await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, true);
    // await NFT_CONTRACT.connect(ACCOUNTS[4]).approve(CONTRACT.address, 1);
  });

  it('deploys successfully', async () => {
    const address = await CONTRACT.address;
    assert.notEqual(address, '');
    assert.notEqual(address, 0x0);
  });

  describe('Proxy testing', async () => {
    it('upgrade', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0]).version()).to.be.equal('v1');
      const oldContractAddress = CONTRACT.address;
      const oldImplementationAddress = await CONTRACT.connect(ACCOUNTS[0]).getImplementation();

      const contractFactory = await ethers.getContractFactory("AvaxTrade2");
      await upgrades.upgradeProxy(CONTRACT.address, contractFactory);

      expect(await CONTRACT.connect(ACCOUNTS[0]).version()).to.be.equal('v2');
      expect(oldContractAddress).to.be.equal(CONTRACT.address);
      expect(oldImplementationAddress).to.not.be.equal(await CONTRACT.connect(ACCOUNTS[0]).getImplementation());
      expect(await upgrades.prepareUpgrade(CONTRACT.address, contractFactory))
        .to.be.equal(await CONTRACT.connect(ACCOUNTS[0]).getImplementation());
    });
    it('upgrade - not owner', async () => {
      const role = await CONTRACT.connect(ACCOUNTS[0]).ADMIN_ROLE();
      await CONTRACT.connect(ACCOUNTS[0]).renounceRole(role, ACCOUNTS[0].address);

      const contractFactory = await ethers.getContractFactory("AvaxTrade2");
      await upgrades.upgradeProxy(CONTRACT.address, contractFactory)
        .should.be.rejectedWith('AccessControl: account 0xda121ab48c7675e4f25e28636e3efe602e49eec6 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
  });

  describe('Attribute functions', async () => {

    it('get sibling contracts', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);
    });
    it('set sibling contracts - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).setContracts(EMPTY_ADDRESS, EMPTY_ADDRESS, EMPTY_ADDRESS)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('set sibling contracts - not change any address', async () => {
      let result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).setContracts(EMPTY_ADDRESS, EMPTY_ADDRESS, EMPTY_ADDRESS);

      result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);
    });
    it('set sibling contracts - only change bank address', async () => {
      let result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).setContracts(ACCOUNTS[5].address, EMPTY_ADDRESS, EMPTY_ADDRESS);

      result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(ACCOUNTS[5].address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);
    });
    it('set sibling contracts - only change sale address', async () => {
      let result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).setContracts(EMPTY_ADDRESS, ACCOUNTS[5].address, EMPTY_ADDRESS);

      result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(ACCOUNTS[5].address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);
    });
    it('set sibling contracts - only change collectionItem address', async () => {
      let result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).setContracts(EMPTY_ADDRESS, EMPTY_ADDRESS, ACCOUNTS[5].address);

      result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(ACCOUNTS[5].address);
    });
    it('set sibling contracts - change all addresses', async () => {
      let result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(BANK_CONTRACT.address);
      expect(result.sale).to.be.equal(SALE_CONTRACT.address);
      expect(result.collectionItem).to.be.equal(COLLECTION_ITEM_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).setContracts(ACCOUNTS[3].address, ACCOUNTS[4].address, ACCOUNTS[5].address);

      result = await CONTRACT.connect(ACCOUNTS[0]).getContracts();
      expect(result.bank).to.be.equal(ACCOUNTS[3].address);
      expect(result.sale).to.be.equal(ACCOUNTS[4].address);
      expect(result.collectionItem).to.be.equal(ACCOUNTS[5].address);
    });

    it('get marketplace listing price', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceListingPrice()).to.be.equal(0);
    });
    it('set marketplace listing price - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).setMarketplaceListingPrice(ethers.utils.parseEther('5'))
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('set marketplace listing price - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceListingPrice(ethers.utils.parseEther('5'));
      const result = await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceListingPrice();
      expect(ethers.utils.formatEther(result)).to.be.equal('5.0');
    });

    it('get marketplace commission', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceCommission()).to.be.equal(2);
    });
    it('set marketplace commission - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).setMarketplaceCommission(5)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('set marketplace commission - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceCommission(5);
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceCommission()).to.be.equal(5);
    });

    it('get marketplace incentive commission', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceIncentiveCommission()).to.be.equal(0);
    });
    it('set marketplace incentive commission - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).setMarketplaceIncentiveCommission(5)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('set marketplace incentive commission - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(5);
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceIncentiveCommission()).to.be.equal(5);
    });

    it('get marketplace bank owner', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceBankOwner()).to.be.equal(ACCOUNTS[0].address);
    });
    it('set marketplace bank owner - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).setMarketplaceBankOwner(ACCOUNTS[1].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('set marketplace bank owner - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceBankOwner(ACCOUNTS[1].address);
      expect(await CONTRACT.connect(ACCOUNTS[0]).getMarketplaceBankOwner()).to.be.equal(ACCOUNTS[1].address);
    });
  });

  describe('Main Functions - Unverified', async () => {
    beforeEach(async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await NFT_CONTRACT.connect(ACCOUNTS[3]).mint(1, { value: ethers.utils.parseEther('0.50') });
      await NFT_CONTRACT.connect(ACCOUNTS[3])['safeTransferFrom(address,address,uint256)'](ACCOUNTS[3].address, ACCOUNTS[4].address, 1);
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, true);
    });

    it('not admin', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createUnvariviedCollection()
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });

    it('create market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceListingPrice(ethers.utils.parseEther('5'));
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Not enough funds to create sale');
    });
    it('create market sale - price < 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('-1'), 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value={"type":"BigNumber","hex":"-0x0de0b6b3a7640000"}, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - price < 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, -1, 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value=-1, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - direct - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 0
      );
      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('0.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;
    });
    it('create market sale - immediate - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - auction - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 2
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - price = 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, 0, 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - no permission', async () => {
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, false);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('ERC721: transfer caller is not owner nor approved');
    });
    it('create market sale - invalid IERC721 or IERC1155 contract', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Provided contract address is not valid');
    });
    it('create market sale - non-contract address passed in', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, ACCOUNTS[3].address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Transaction reverted: function returned an unexpected amount of data');
    });
    it('create market sale - not owner of item', async () => {
      await CONTRACT.connect(ACCOUNTS[5]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('You are not the owner of this item');
    });
    it('create market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(ACCOUNTS[5].address);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(0);
    });
    it('create market sale - immediate', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(1);
    });
    it('create market sale - auction', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 2
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(2);
    });

    it('cancel market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('cancel market sale - item already sold', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item has already been sold');
    });
    it('cancel market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('cancel market sale - not item owner', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[5]).cancelMarketSale(1)
        .should.be.rejectedWith('You are not the original owner of this item');
    });
    it('cancel market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - immediate', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - auction', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 2
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });

    it('complete market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('complete market sale - item already sold', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('This item has already been sold');
    });
    it('complete market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('complete market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('1') })
        .should.be.rejectedWith('Not enough funds to purchase this item');
    });
    it('complete market sale - buy own item', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You can not buy your own item');
    });
    it('complete market sale - direct - buyer not authorized', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );
      await CONTRACT.connect(ACCOUNTS[6]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You are not the authorized buyer');
    });
    it('complete market sale - invalid sale type', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 3
      ).should.be.rejectedWith('Transaction reverted: function was called with incorrect parameters');;
    });
    it('complete market sale - direct - sale price 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - sale price 0 - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.9');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - immediate - no market incentive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - yes market incentive - 0% percent', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - yes market incentive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance + (expectedBalance*0.02); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in market vault', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('0.05') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      const balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance + (balanceSheet.incentiveVault*1); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - yes market incentive - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.998');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
  });

  describe('Main Functions - Local', async () => {
    beforeEach(async () => {
      contractFactory = await ethers.getContractFactory("AvaxTradeNft");
      NFT_CONTRACT = await contractFactory.deploy('Local AvaxTrade', 'LAX', 'ipfs://');
      await NFT_CONTRACT.deployed();

      await NFT_CONTRACT.connect(ACCOUNTS[3]).mint(2, 'cid', { value: ethers.utils.parseEther('0.50') });
      await NFT_CONTRACT.connect(ACCOUNTS[3])['safeTransferFrom(address,address,uint256)'](ACCOUNTS[3].address, ACCOUNTS[4].address, 1);
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, true);

      await CONTRACT.connect(ACCOUNTS[0]).createLocalCollection(NFT_CONTRACT.address);
    });

    it('not admin', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createLocalCollection(NFT_CONTRACT.address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });

    it('create market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceListingPrice(ethers.utils.parseEther('5'));
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Not enough funds to create sale');
    });
    it('create market sale - price < 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('-1'), 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value={"type":"BigNumber","hex":"-0x0de0b6b3a7640000"}, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - price < 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, -1, 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value=-1, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - direct - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 0
      );
      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('0.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(2);
      expect(item.creator).to.be.equal(ACCOUNTS[3].address);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;
    });
    it('create market sale - immediate - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - auction - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 2
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - price = 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, 0, 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - no permission', async () => {
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, false);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('ERC721: transfer caller is not owner nor approved');
    });
    it('create market sale - invalid IERC721 or IERC1155 contract', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Provided contract address is not valid');
    });
    it('create market sale - non-contract address passed in', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, ACCOUNTS[3].address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Transaction reverted: function returned an unexpected amount of data');
    });
    it('create market sale - not owner of item', async () => {
      await CONTRACT.connect(ACCOUNTS[5]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('You are not the owner of this item');
    });
    it('create market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(ACCOUNTS[5].address);
      expect(item.commission).to.be.equal(2);
      expect(item.creator).to.be.equal(ACCOUNTS[3].address);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(0);
    });
    it('create market sale - immediate', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(2);
      expect(item.creator).to.be.equal(ACCOUNTS[3].address);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(1);
    });
    it('create market sale - auction', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 2
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(2);
      expect(item.creator).to.be.equal(ACCOUNTS[3].address);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(2);
    });

    it('cancel market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('cancel market sale - item already sold', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.802');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item has already been sold');
    });
    it('cancel market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('cancel market sale - not item owner', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[5]).cancelMarketSale(1)
        .should.be.rejectedWith('You are not the original owner of this item');
    });
    it('cancel market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - immediate', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - auction', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 2
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });

    it('complete market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('complete market sale - item already sold', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.802');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('This item has already been sold');
    });
    it('complete market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('complete market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('1') })
        .should.be.rejectedWith('Not enough funds to purchase this item');
    });
    it('complete market sale - buy own item', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You can not buy your own item');
    });
    it('complete market sale - direct - buyer not authorized', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );
      await CONTRACT.connect(ACCOUNTS[6]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You are not the authorized buyer');
    });
    it('complete market sale - invalid sale type', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 3
      ).should.be.rejectedWith('Transaction reverted: function was called with incorrect parameters');;
    });
    it('complete market sale - direct - sale price 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - sale price 0 - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.802');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.098');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.802');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - immediate - -2%, -2%', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // artist commission
      expectedBalance = expectedBalance + (ethers.utils.parseEther('100')*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, +0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // artist commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, +2', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // artist commission
      expectedBalance = expectedBalance + (expectedBalance*0.02); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in market vault', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('0.05') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      const balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // artist commission
      expectedBalance = expectedBalance + (balanceSheet.incentiveVault*1); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, +2 - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // artist
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.098');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.89804');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
  });

  describe('Main Functions - Verified', async () => {
    beforeEach(async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await NFT_CONTRACT.connect(ACCOUNTS[3]).mint(1, { value: ethers.utils.parseEther('0.50') });
      await NFT_CONTRACT.connect(ACCOUNTS[3])['safeTransferFrom(address,address,uint256)'](ACCOUNTS[3].address, ACCOUNTS[4].address, 1);
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, true);

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, false
      );
    });

    it('not admin', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createVerifiedCollection(
        ACCOUNTS[1].address, 5, 2, 3, ACCOUNTS[3].address, false
      );
    });

    it('create market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceListingPrice(ethers.utils.parseEther('5'));
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Not enough funds to create sale');
    });
    it('create market sale - price < 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('-1'), 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value={"type":"BigNumber","hex":"-0x0de0b6b3a7640000"}, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - price < 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, -1, 1
      ).should.be.rejectedWith('value out-of-bounds (argument="_price", value=-1, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('create market sale - direct - price = 0 - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 0
      );
      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('0.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;
    });
    it('create market sale - direct - price = 0 - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 0
      );
      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('0.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;
    });
    it('create market sale - immediate - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - auction - price = 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('0'), 2
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - price = 0 int', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, 0, 1
      ).should.be.rejectedWith('Buy price must be greater than 0');
    });
    it('create market sale - no permission', async () => {
      await NFT_CONTRACT.connect(ACCOUNTS[4]).setApprovalForAll(CONTRACT.address, false);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('ERC721: transfer caller is not owner nor approved');
    });
    it('create market sale - invalid IERC721 or IERC1155 contract', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Provided contract address is not valid');
    });
    it('create market sale - non-contract address passed in', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, ACCOUNTS[3].address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('Transaction reverted: function returned an unexpected amount of data');
    });
    it('create market sale - not owner of item', async () => {
      await CONTRACT.connect(ACCOUNTS[5]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      ).should.be.rejectedWith('You are not the owner of this item');
    });
    it('create market sale - direct - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(ACCOUNTS[5].address);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(0);
    });
    it('create market sale - direct - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(ACCOUNTS[5].address);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(0);
    });
    it('create market sale - immediate - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(1);
    });
    it('create market sale - immediate - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(1);
    });
    it('create market sale - auction - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 2
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(2);
    });
    it('create market sale - auction - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 2
      );

      const nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      const item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.seller).to.be.equal(ACCOUNTS[4].address);
      expect(item.collectionId).to.be.equal(2);
      expect(item.tokenId).to.be.equal(1);
      expect(item.contractAddress).to.be.equal(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(item.price)).to.be.equal('5.0');
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.false;
      expect(item.active).to.be.true;

      const sale = await SALE_CONTRACT.connect(ACCOUNTS[4]).getSale(item.id);
      expect(sale.saleType).to.be.equal(2);
    });

    it('cancel market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('cancel market sale - item already sold - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item has already been sold');
    });
    it('cancel market sale - item already sold - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.65794');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item has already been sold');
    });
    it('cancel market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('cancel market sale - not item owner', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[5]).cancelMarketSale(1)
        .should.be.rejectedWith('You are not the original owner of this item');
    });
    it('cancel market sale - direct', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - immediate', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });
    it('cancel market sale - auction', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 2
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.true;
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).cancelMarketSale(1);

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.active).to.be.false;
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[4].address);
    });

    it('complete market sale - item does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('The item does not exist');
    });
    it('complete market sale - item already sold - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('This item has already been sold');
    });
    it('complete market sale - item already sold - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.65794');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('This item has already been sold');
    });
    it('complete market sale - item inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).deactivateItem(1);

      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1)
        .should.be.rejectedWith('This item is inactive');
    });
    it('complete market sale - not enough funds', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('1') })
        .should.be.rejectedWith('Not enough funds to purchase this item');
    });
    it('complete market sale - buy own item', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, EMPTY_ADDRESS, ethers.utils.parseEther('5'), 1
      );
      await CONTRACT.connect(ACCOUNTS[4]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You can not buy your own item');
    });
    it('complete market sale - direct - buyer not authorized', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );
      await CONTRACT.connect(ACCOUNTS[6]).completeMarketSale(1, { value: ethers.utils.parseEther('5') })
        .should.be.rejectedWith('You are not the authorized buyer');
    });
    it('complete market sale - invalid sale type', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 3
      ).should.be.rejectedWith('Transaction reverted: function was called with incorrect parameters');;
    });
    it('complete market sale - direct - sale price 0', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - sale price 0 - claim', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('0'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('0') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - direct - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.9');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.65794');
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - direct - claim - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.9');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - direct - claim - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 0
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196'),
        ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.14406');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.65794');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('complete market sale - immediate - -2%, -0%, -0%', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 0, 0, 0, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -7%, -0% - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 7, 0, 0, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -7%, -0% - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 7, 0, 0, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.07); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -0%, -5% - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 0, 5, 0, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -0%, -5% - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 0, 5, 0, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.05); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -3% - inactive', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -3% - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.03); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3 - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3 - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.04); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.03); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in collection vault - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('0.05') });
      const collectionVault = await BANK_CONTRACT.connect(ACCOUNTS[5]).getIncentiveVaultCollectionAccount(NFT_CONTRACT.address);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in collection vault - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('0.05') });
      const collectionVault = await BANK_CONTRACT.connect(ACCOUNTS[5]).getIncentiveVaultCollectionAccount(NFT_CONTRACT.address);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.04); // collection commission
      expectedBalance = expectedBalance + (collectionVault*1); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +0 - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +0 - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.04); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.03); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.00); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +2 - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.02); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +2 - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.04); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.03); // collection incentive
      expectedBalance = expectedBalance + (expectedBalance*0.02); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in market vault - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('0.05') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      const balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.00); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.00); // collection incentive
      expectedBalance = expectedBalance + (balanceSheet.incentiveVault*1); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - not enough in market vault - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.false;
      let balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      let nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('0.05') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      const balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      item = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getItemOfOwner(1, NFT_CONTRACT.address, ACCOUNTS[4].address);
      expect(item.sold).to.be.true;
      balance = await BANK_CONTRACT.connect(ACCOUNTS[4]).getGeneralUserAccount(ACCOUNTS[4].address);
      let expectedBalance = ethers.utils.parseEther('5');
      expectedBalance = expectedBalance - (expectedBalance*0.02); // marketplace commission
      expectedBalance = expectedBalance - (expectedBalance*0.02); // collection reflection
      expectedBalance = expectedBalance - (expectedBalance*0.04); // collection commission
      expectedBalance = expectedBalance + (expectedBalance*0.03); // collection incentive
      expectedBalance = expectedBalance + (balanceSheet.incentiveVault*1); // marketplace incentive
      expectedBalance = ethers.utils.formatEther(expectedBalance.toString()); // convert to proper form
      expect(ethers.utils.formatEther(balance)).to.be.equal(expectedBalance);
      nftOwner = await NFT_CONTRACT.connect(ACCOUNTS[4]).ownerOf(1);
      expect(nftOwner).to.be.equal(ACCOUNTS[5].address);
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +2 - claim - inactive', async () => {
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('10.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.998');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // marketplace incentive vault
      bank = await CONTRACT.connect(ACCOUNTS[0]).getBalanceSheet();
      expect(ethers.utils.formatEther(bank.incentiveVault)).to.be.equal('99.902');
    });
    it('complete market sale - immediate - -2%, -2%, -4%, +3, +2 - claim - active', async () => {
      const collectionId = await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[4]).getCollectionForContract(NFT_CONTRACT.address);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[0]).activateCollection(collectionId);
      await COLLECTION_ITEM_CONTRACT.connect(ACCOUNTS[3]).updateCollection(
        2, 2, 4, 3, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[4]).createMarketSale(
        1, NFT_CONTRACT.address, ACCOUNTS[5].address, ethers.utils.parseEther('5'), 1
      );

      let bank;
      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });
      await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
      await CONTRACT.connect(ACCOUNTS[0]).setMarketplaceIncentiveCommission(2);
      await CONTRACT.connect(ACCOUNTS[5]).completeMarketSale(1, { value: ethers.utils.parseEther('5') });

      // admin
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[0].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.1');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[0].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196'),
        ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196'), ethers.utils.parseUnits('0.0196')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('9.8617024');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // collection owner
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[3].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.19208');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // seller
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[4].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('4.843181952');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[4].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // buyer
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[5].address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      expect(await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[5].address)).that.is.empty;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      // marketplace incentive vault
      bank = await CONTRACT.connect(ACCOUNTS[0]).getBalanceSheet();
      expect(ethers.utils.formatEther(bank.incentiveVault)).to.be.equal('99.905035648');
    });
  });

  describe('Monetary Functions', async () => {

    it('deposit into collection incentive vault', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, false
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');
    });
    it('withdraw from collection incentive vault - not owner', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, false
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');

      await CONTRACT.connect(ACCOUNTS[4]).withdrawIncentiveCollectionAccount(NFT_CONTRACT.address, ethers.utils.parseEther('20'))
        .should.be.rejectedWith('You are not the owner of this collection');
    });
    it('withdraw from collection incentive vault - yes owner - no access', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, false
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');

      await CONTRACT.connect(ACCOUNTS[3]).withdrawIncentiveCollectionAccount(NFT_CONTRACT.address, ethers.utils.parseEther('20'))
        .should.be.rejectedWith('You do not have access to withdraw');
    });
    it('withdraw from collection incentive vault - yes owner - yes access - > vault balance', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');

      await CONTRACT.connect(ACCOUNTS[3]).withdrawIncentiveCollectionAccount(NFT_CONTRACT.address, ethers.utils.parseEther('20'))
        .should.be.rejectedWith('Bank: Withdraw amount must be less than or equal to vault balance');
    });
    it('withdraw from collection incentive vault - yes owner - yes access - < vault balance', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      let bank;
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('10.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[3]).withdrawIncentiveCollectionAccount(NFT_CONTRACT.address, ethers.utils.parseEther('2'));

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('8.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('8.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('8.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });
    it('withdraw from collection incentive vault - yes owner - yes access - == vault balance', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      let bank;
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).depositIncentiveCollectionAccount(NFT_CONTRACT.address, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('10.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('10.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[3]).withdrawIncentiveCollectionAccount(NFT_CONTRACT.address, ethers.utils.parseEther('10'));

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionIncentive)).to.be.equal('0.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });

    it('distrubute reward among all NFT holders - unverified', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardInCollection(1, { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Not a verified collection');
    });
    it('distrubute reward among all NFT holders - local', async () => {
      contractFactory = await ethers.getContractFactory("AvaxTradeNft");
      NFT_CONTRACT = await contractFactory.deploy('Local AvaxTrade', 'LAX', 'ipfs://');
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createLocalCollection(NFT_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardInCollection(2, { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Not a verified collection');
    });
    it('distrubute reward among all NFT holders - verified', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionReflection)).to.be.equal('0.0');

      let bank;
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardInCollection(2, { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionReflection)).to.be.equal('10.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('2.0'), ethers.utils.parseUnits('2.0'),
        ethers.utils.parseUnits('2.0'), ethers.utils.parseUnits('2.0'), ethers.utils.parseUnits('2.0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });

    it('distrubute reward among all NFT holders - unverified', async () => {
      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(1, [2,3], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Not a verified collection');
    });
    it('distrubute reward among all NFT holders - local', async () => {
      contractFactory = await ethers.getContractFactory("AvaxTradeNft");
      NFT_CONTRACT = await contractFactory.deploy('Local AvaxTrade', 'LAX', 'ipfs://');
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createLocalCollection(NFT_CONTRACT.address);

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [2,3], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Not a verified collection');
    });
    it('distrubute reward among all NFT holders - verified - empty token id list', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Token id list must be greater than 0');
    });
    it('distrubute reward among all NFT holders - verified - invalid token id list', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [0,2,3], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Token id must be greater than 0');
    });
    it('distrubute reward among all NFT holders - verified - negative token id list', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [2,-3], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('value out-of-bounds (argument=null, value=-3, code=INVALID_ARGUMENT, version=abi/5.6.3)');
    });
    it('distrubute reward among all NFT holders - verified - token id list > supply', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [1,2,3,4,5,6], { value: ethers.utils.parseEther('10') })
        .should.be.rejectedWith('Token id list must not exceed size of collection total supply');
    });
    it('distrubute reward among all NFT holders - verified', async () => {
      contractFactory = await ethers.getContractFactory("SampleErc721");
      NFT_CONTRACT = await contractFactory.deploy();
      await NFT_CONTRACT.deployed();

      await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
        NFT_CONTRACT.address, 5, 2, 3, ACCOUNTS[3].address, true
      );

      let contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('0.0');
      let balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionReflection)).to.be.equal('0.0');

      let bank;
      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      let reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[4]).distributeRewardListInCollection(2, [1,3], { value: ethers.utils.parseEther('10') });

      contractBalance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(contractBalance)).to.be.equal('10.0');
      balanceSheet = await CONTRACT.connect(ACCOUNTS[4]).getBalanceSheet();
      expect(ethers.utils.formatEther(balanceSheet.collectionReflection)).to.be.equal('10.0');

      bank = await BANK_CONTRACT.connect(ACCOUNTS[0]).getBank(NFT_CONTRACT.address);
      expect(ethers.utils.formatEther(bank.user.general)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.nftCommission)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.user.collectionCommission)).to.be.equal('0.0');
      reflectionAccount = await BANK_CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(NFT_CONTRACT.address);
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.utils.parseUnits('5.0'), ethers.utils.parseUnits('0'),
        ethers.utils.parseUnits('5.0'), ethers.utils.parseUnits('0'), ethers.utils.parseUnits('0')
      ])).to.be.true;
      expect(ethers.utils.formatEther(bank.collection.incentiveVault)).to.be.equal('0.0');
      expect(ethers.utils.formatEther(bank.vault.balance)).to.be.equal('0.0');
    });

  });

  // describe('Reward Functions', async () => {

  //   it('marketplace commission', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.marketplaceCommission(ethers.utils.parseEther('10'), 2);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('9.8');
  //   });
  //   it('marketplace commission - 0%', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.marketplaceCommission(ethers.utils.parseEther('10'), 0);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });

  //   it('nft commission', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.nftCommission(ethers.utils.parseEther('10'), 2, ACCOUNTS[4].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('9.8');
  //   });
  //   it('nft commission - 0%', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.nftCommission(ethers.utils.parseEther('10'), 0, ACCOUNTS[4].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });

  //   it('collection reflection', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
  //       ACCOUNTS[5].address, 10, 0, 0, ACCOUNTS[4].address, false
  //     );
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionReflection(ethers.utils.parseEther('10'), 2, ACCOUNTS[5].address, 10);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('9.8');
  //   });
  //   it('collection reflection - 0%', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionReflection(ethers.utils.parseEther('10'), 0, ACCOUNTS[5].address, 10);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });

  //   it('collection commission', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionCommission(ethers.utils.parseEther('10'), 2, ACCOUNTS[4].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('9.8');
  //   });
  //   it('collection commission - 0%', async () => {
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionCommission(ethers.utils.parseEther('10'), 0, ACCOUNTS[4].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });

  //   it('collection incentive', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
  //       ACCOUNTS[5].address, 10, 0, 0, ACCOUNTS[4].address, false
  //     );
  //     await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(ACCOUNTS[5].address, { value: ethers.utils.parseEther('100') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionIncentive(ethers.utils.parseEther('10'), 2, ACCOUNTS[5].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.2');
  //   });
  //   it('collection incentive - 0%', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
  //       ACCOUNTS[5].address, 10, 0, 0, ACCOUNTS[4].address, false
  //     );
  //     await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(ACCOUNTS[5].address, { value: ethers.utils.parseEther('100') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionIncentive(ethers.utils.parseEther('10'), 0, ACCOUNTS[5].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });
  //   it('collection incentive - not enough in vault', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).createVerifiedCollection(
  //       ACCOUNTS[5].address, 10, 0, 0, ACCOUNTS[4].address, false
  //     );
  //     await CONTRACT.connect(ACCOUNTS[0]).depositIncentiveCollectionAccount(ACCOUNTS[5].address, { value: ethers.utils.parseEther('0.05') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.collectionIncentive(ethers.utils.parseEther('10'), 2, ACCOUNTS[5].address);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.05');
  //   });

  //   it('marketplace incentive', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.marketplaceIncentive(ethers.utils.parseEther('10'), 2);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.2');
  //   });
  //   it('marketplace incentive - 0%', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('100') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.marketplaceIncentive(ethers.utils.parseEther('10'), 0);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.0');
  //   });
  //   it('marketplace incentive - not enough in vault', async () => {
  //     await CONTRACT.connect(ACCOUNTS[0]).depositMarketplaceIncentiveVault({ value: ethers.utils.parseEther('0.05') });
  //     const result = await CONTRACT.connect(ACCOUNTS[4]).callStatic.marketplaceIncentive(ethers.utils.parseEther('10'), 2);
  //     expect(ethers.utils.formatEther(result)).to.be.equal('10.05');
  //   });
  // });

});
