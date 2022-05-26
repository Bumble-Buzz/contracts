const _ = require('lodash');
const { assert, expect } = require('chai');
require('chai').use(require('chai-as-promised')).should();
const { ethers } = require("hardhat");


// global variables
let ACCOUNTS = [];
let CONTRACT;
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

describe("AvaxTrade - Item", () => {
  before(async () => {
    ACCOUNTS = await ethers.getSigners();
  });

  beforeEach(async () => {
    const contractFactory = await ethers.getContractFactory("Item");
    CONTRACT = await contractFactory.deploy();
    await CONTRACT.deployed();
    await CONTRACT.connect(ACCOUNTS[0]).__Item_init();
  });

  it('deploys successfully', async () => {
    const address = await CONTRACT.address;
    assert.notEqual(address, '');
    assert.notEqual(address, 0x0);
  });

  describe('Attribute functions', async () => {
    it('get item id pointer', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer();
      expect(result).to.be.equal(0);
    });
    it('increment item id pointer', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addEmptyItem();
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer();
      expect(result).to.be.equal(1);
    });
    it('reset item id pointer', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._resetItemIdPointer();
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer();
      expect(result).to.be.equal(0);
    });
  });

  describe('Item owner', async () => {
    // mapping(address => uint256[]) private ITEM_OWNERS;

    it('get item for owner', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.empty;
    });
    it('add item for owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 123);
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('remove item for owner - one item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 123);

      let result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeItemForOwner(ACCOUNTS[1].address, 123);

      result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.empty;
    });
    it('remove item for owner - two items', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 123);
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 456);

      let result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('123'))).to.be.true;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('456'))).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeItemForOwner(ACCOUNTS[1].address, 123);

      result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('456'))).to.be.true;
    });
    it('remove item owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 123);
      await CONTRACT.connect(ACCOUNTS[0])._addItemForOwner(ACCOUNTS[1].address, 456);

      let result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('123'))).to.be.true;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('456'))).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeItemOwner(ACCOUNTS[1].address);

      result = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[1].address);
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('Item id', async () => {
    // uint256[] private ITEM_IDS;

    it('get item ids', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('add item id', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItemId(123);
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('remove item id - one item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addEmptyItem();

      let result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('1')])).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeItemId(1);

      result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('remove item id - two items', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addEmptyItem();
      await CONTRACT.connect(ACCOUNTS[0])._addEmptyItem();

      let result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('1'),ethers.BigNumber.from('2')])).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeItemId(1);

      result = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('2'))).to.be.true;
    });
  });

  describe('Main functions', async () => {
    // {
    //   uint256 id; // unique item id
    //   uint256 collectionId; // collection id associated with this item
    //   uint256 tokenId; // unique token id of the item
    //   address contractAddress;
    //   address seller; // address of the seller / current owner
    //   address buyer; // address of the buyer / next owner (empty if not yet bought)
    //   uint256 price; // price of the item
    //   uint8 commission; // in percentage
    //   address creator; // original creator of the item
    //   bool sold;
    //   bool active;
    // }
    // mapping(uint256 => ItemDS) private ITEMS;

    it('get all items', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0])._getAllItems();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('get item 1 - does not exist', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0])._getItem(1)
        .should.be.rejectedWith('The item does not exist');
    });

    it('add empty item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addEmptyItem();
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer()).to.be.equal(1);
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;
    });
    it('add local item - invalid commission percent', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 100, ACCOUNTS[3].address
      ).should.be.rejectedWith('Item: Commission percent must be < 100');
    });
    it('add local item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(itemOwner, [ethers.BigNumber.from('1')])).to.be.true;

      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCollectionId(1)).to.be.equal(1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemTokenId(1)).to.be.equal(2);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemContractAddress(1)).to.be.equal(ACCOUNTS[1].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSeller(1)).to.be.equal(ACCOUNTS[2].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemBuyer(1)).to.be.equal(EMPTY_ADDRESS);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemPrice(1)).to.be.equal(123);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCommission(1)).to.be.equal(2);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCreator(1)).to.be.equal(ACCOUNTS[3].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSold(1)).to.be.equal(false);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemActive(1)).to.be.equal(true);
    });
    it('add direct item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, ACCOUNTS[3].address, 123, 0, EMPTY_ADDRESS
      );
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(itemOwner, [ethers.BigNumber.from('1')])).to.be.true;

      const item = await CONTRACT.connect(ACCOUNTS[0])._getItem(1);
      expect(item.id).to.be.equal(1);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(2);
      expect(item.contractAddress).to.be.equal(ACCOUNTS[1].address);
      expect(item.seller).to.be.equal(ACCOUNTS[2].address);
      expect(item.buyer).to.be.equal(ACCOUNTS[3].address);
      expect(item.price).to.be.equal(123);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.equal(false);
      expect(item.active).to.be.equal(true);
    });
    it('add verified item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(itemOwner, [ethers.BigNumber.from('1')])).to.be.true;

      const item = await CONTRACT.connect(ACCOUNTS[0])._getItem(1);
      expect(item.id).to.be.equal(1);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(2);
      expect(item.contractAddress).to.be.equal(ACCOUNTS[1].address);
      expect(item.seller).to.be.equal(ACCOUNTS[2].address);
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.price).to.be.equal(123);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.equal(false);
      expect(item.active).to.be.equal(true);
    });
    it('add unverified item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(itemOwner, [ethers.BigNumber.from('1')])).to.be.true;

      const item = await CONTRACT.connect(ACCOUNTS[0])._getItem(1);
      expect(item.id).to.be.equal(1);
      expect(item.collectionId).to.be.equal(1);
      expect(item.tokenId).to.be.equal(2);
      expect(item.contractAddress).to.be.equal(ACCOUNTS[1].address);
      expect(item.seller).to.be.equal(ACCOUNTS[2].address);
      expect(item.buyer).to.be.equal(EMPTY_ADDRESS);
      expect(item.price).to.be.equal(123);
      expect(item.commission).to.be.equal(0);
      expect(item.creator).to.be.equal(EMPTY_ADDRESS);
      expect(item.sold).to.be.equal(false);
      expect(item.active).to.be.equal(true);
    });
    it('add multiple items - same user', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );

      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(8);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('2'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('3'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('4'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('5'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('6'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('7'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('8'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('1'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('2'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('3'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('4'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('5'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('6'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('7'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('8'))).to.be.true;

      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(1)).id).to.be.equal(1);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(2)).id).to.be.equal(2);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(3)).id).to.be.equal(3);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(4)).id).to.be.equal(4);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(5)).id).to.be.equal(5);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(6)).id).to.be.equal(6);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(7)).id).to.be.equal(7);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(8)).id).to.be.equal(8);
    });
    it('add multiple items - different users', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[4].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[4].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[5].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[6].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[4].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[6].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );

      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(8);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('2'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('3'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('4'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('5'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('6'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('7'))).to.be.true;
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('8'))).to.be.true;

      let itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('1'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('5'))).to.be.true;
      itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[4].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('2'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('3'))).to.be.true;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('7'))).to.be.true;

      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(1)).id).to.be.equal(1);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(1)).seller).to.be.equal(ACCOUNTS[2].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(1)).creator).to.be.equal(ACCOUNTS[3].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(2)).id).to.be.equal(2);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(2)).seller).to.be.equal(ACCOUNTS[4].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(3)).id).to.be.equal(3);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(3)).seller).to.be.equal(ACCOUNTS[4].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(4)).id).to.be.equal(4);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(4)).seller).to.be.equal(ACCOUNTS[5].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(4)).creator).to.be.equal('0x0000000000000000000000000000000000000000');
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(5)).id).to.be.equal(5);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(5)).seller).to.be.equal(ACCOUNTS[2].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(5)).creator).to.be.equal(ACCOUNTS[3].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(6)).id).to.be.equal(6);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(6)).seller).to.be.equal(ACCOUNTS[6].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(6)).creator).to.be.equal('0x0000000000000000000000000000000000000000');
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(7)).id).to.be.equal(7);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(7)).seller).to.be.equal(ACCOUNTS[4].address);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(7)).creator).to.be.equal('0x0000000000000000000000000000000000000000');
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(8)).id).to.be.equal(8);
      expect((await CONTRACT.connect(ACCOUNTS[0])._getItem(8)).seller).to.be.equal(ACCOUNTS[6].address);
    });
    it('deactivate item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 0, EMPTY_ADDRESS
      );

      let itemIdPointer = await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer();
      expect(itemIdPointer).to.be.equal(3);

      let itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(3);

      let item = await CONTRACT.connect(ACCOUNTS[0])._getItem(2);
      expect(item.active).to.be.equal(true);

      let itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('2'))).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._deactivateItem(2); // deactivate item

      itemIdPointer = await CONTRACT.connect(ACCOUNTS[0])._getItemIdPointer();
      expect(itemIdPointer).to.be.equal(3);

      itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(2);

      item = await CONTRACT.connect(ACCOUNTS[0])._getItem(2);
      expect(item.active).to.be.equal(false);

      itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(itemOwner, ethers.BigNumber.from('2'))).to.be.true;
    });
    it('update item - invalid commission percent', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      await CONTRACT.connect(ACCOUNTS[0])._updateItem(
        1, 1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 456, 100, ACCOUNTS[3].address, false, false
      ).should.be.rejectedWith('Item: Commission percent must be < 100');
    });
    it('update item', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
      const itemIds = await CONTRACT.connect(ACCOUNTS[0])._getItemIds();
      expect(itemIds).to.be.an('array').that.is.not.empty;
      expect(itemIds.length).to.be.equal(1);
      expect(_doesArrayInclude(itemIds, ethers.BigNumber.from('1'))).to.be.true;

      const itemOwner = await CONTRACT.connect(ACCOUNTS[0])._getItemsForOwner(ACCOUNTS[2].address);
      expect(itemOwner).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(itemOwner, [ethers.BigNumber.from('1')])).to.be.true;

      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCollectionId(1)).to.be.equal(1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemTokenId(1)).to.be.equal(2);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemContractAddress(1)).to.be.equal(ACCOUNTS[1].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSeller(1)).to.be.equal(ACCOUNTS[2].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemBuyer(1)).to.be.equal(EMPTY_ADDRESS);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemPrice(1)).to.be.equal(123);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCommission(1)).to.be.equal(2);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCreator(1)).to.be.equal(ACCOUNTS[3].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSold(1)).to.be.equal(false);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemActive(1)).to.be.equal(true);

      await CONTRACT.connect(ACCOUNTS[0])._updateItem(
        1, 1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 456, 5, ACCOUNTS[3].address, false, false
      );

      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCollectionId(1)).to.be.equal(1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemTokenId(1)).to.be.equal(2);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemContractAddress(1)).to.be.equal(ACCOUNTS[1].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSeller(1)).to.be.equal(ACCOUNTS[2].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemBuyer(1)).to.be.equal(EMPTY_ADDRESS);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemPrice(1)).to.be.equal(456);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCommission(1)).to.be.equal(5);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCreator(1)).to.be.equal(ACCOUNTS[3].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSold(1)).to.be.equal(false);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemActive(1)).to.be.equal(false);
    });
  });

  describe('item properties', async () => {
    beforeEach(async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addItem(
        1, 2, ACCOUNTS[1].address, ACCOUNTS[2].address, EMPTY_ADDRESS, 123, 2, ACCOUNTS[3].address
      );
    });

    it('get collection id', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCollectionId(1)).to.be.equal(1);
    });
    it('update collection id', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemCollectionId(1, 222);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCollectionId(1)).to.be.equal(222);
    });

    it('get token id', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemTokenId(1)).to.be.equal(2);
    });
    it('update token id', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemTokenId(1, 222);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemTokenId(1)).to.be.equal(222);
    });

    it('get contract address', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemContractAddress(1)).to.be.equal(ACCOUNTS[1].address);
    });
    it('update contract address', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemContractAddress(1, ACCOUNTS[5].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemContractAddress(1)).to.be.equal(ACCOUNTS[5].address);
    });

    it('get seller', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSeller(1)).to.be.equal(ACCOUNTS[2].address);
    });
    it('update seller', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemSeller(1, ACCOUNTS[5].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSeller(1)).to.be.equal(ACCOUNTS[5].address);
    });

    it('get buyer', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemBuyer(1)).to.be.equal(EMPTY_ADDRESS);
    });
    it('update buyer', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemBuyer(1, ACCOUNTS[5].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemBuyer(1)).to.be.equal(ACCOUNTS[5].address);
    });

    it('get price', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemPrice(1)).to.be.equal(123);
    });
    it('update price', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemPrice(1, 222);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemPrice(1)).to.be.equal(222);
    });

    it('get commission', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCommission(1)).to.be.equal(2);
    });
    it('update commission', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemCommission(1, 222);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCommission(1)).to.be.equal(222);
    });

    it('get creator', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCreator(1)).to.be.equal(ACCOUNTS[3].address);
    });
    it('update creator', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemCreator(1, ACCOUNTS[5].address);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemCreator(1)).to.be.equal(ACCOUNTS[5].address);
    });

    it('get sold boolean', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSold(1)).to.be.equal(false);
    });
    it('update sold boolean', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemSold(1, true);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemSold(1)).to.be.equal(true);
    });

    it('get active boolean', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemActive(1)).to.be.equal(true);
    });
    it('update active boolean', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateItemActive(1, false);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getItemActive(1)).to.be.equal(false);
    });
  });

});
