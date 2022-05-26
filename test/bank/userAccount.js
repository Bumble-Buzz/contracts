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
describe("AvaxTrade - User Account", () => {
  before(async () => {
    ACCOUNTS = await ethers.getSigners();
  });

  beforeEach(async () => {
    const contractFactory = await ethers.getContractFactory("Bank");
    CONTRACT = await contractFactory.deploy();
    await CONTRACT.deployed();
  });

  it('deploys successfully', async () => {
    const address = await CONTRACT.address;
    assert.notEqual(address, '');
    assert.notEqual(address, 0x0);
  });

  describe('Main functions', async () => {
    // {
    //   address id; // owner of these accounts
    //   uint256 general; // any general reward balance
    //   uint256 commission; // commission reward balance from the item
    //   uint256 collectionCommission; // commission reward balance from the collection
    // }

    it('get accounts', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._getUserAccounts([ACCOUNTS[1].address, ACCOUNTS[2].address])
        .should.be.rejectedWith('An account in the list does not exist');
    });
    it('get account 1 - does not exist', async () => {
      const account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(EMPTY_ADDRESS);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);
    });

    it('add account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      const account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);
    });
    it('add multiple same accounts', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      const account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);
    });
    it('add multiple different accounts', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[2].address);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[2].address);
      expect(account.id).to.be.equal(ACCOUNTS[2].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      const accounts = await CONTRACT.connect(ACCOUNTS[0])._getUserAccounts([ACCOUNTS[1].address, ACCOUNTS[2].address]);
      expect(accounts.length).to.be.equal(2);

      expect(accounts[0].id).to.be.equal(ACCOUNTS[1].address);
      expect(accounts[0].general).to.be.equal(0);
      expect(accounts[0].nftCommission).to.be.equal(0);
      expect(accounts[0].collectionCommission).to.be.equal(0);

      expect(accounts[1].id).to.be.equal(ACCOUNTS[2].address);
      expect(accounts[1].general).to.be.equal(0);
      expect(accounts[1].nftCommission).to.be.equal(0);
      expect(accounts[1].collectionCommission).to.be.equal(0);
    });

    it('update account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._updateUserAccount(ACCOUNTS[1].address, 1, 2, 4);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);
    });
    it('update one account out of many', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[3].address);

      await CONTRACT.connect(ACCOUNTS[0])._updateUserAccount(ACCOUNTS[1].address, 1, 2, 4);

      const account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);

      const accounts = await CONTRACT.connect(ACCOUNTS[0])._getUserAccounts(
        [ACCOUNTS[1].address, ACCOUNTS[2].address, ACCOUNTS[3].address]
      );
      expect(accounts.length).to.be.equal(3);

      expect(accounts[0].id).to.be.equal(ACCOUNTS[1].address);
      expect(accounts[0].general).to.be.equal(1);
      expect(accounts[0].nftCommission).to.be.equal(2);
      expect(accounts[0].collectionCommission).to.be.equal(4);

      expect(accounts[1].id).to.be.equal(ACCOUNTS[2].address);
      expect(accounts[1].general).to.be.equal(0);
      expect(accounts[1].nftCommission).to.be.equal(0);
      expect(accounts[1].collectionCommission).to.be.equal(0);

      expect(accounts[2].id).to.be.equal(ACCOUNTS[3].address);
      expect(accounts[2].general).to.be.equal(0);
      expect(accounts[2].nftCommission).to.be.equal(0);
      expect(accounts[2].collectionCommission).to.be.equal(0);
    });
    it('update account then add same account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._updateUserAccount(ACCOUNTS[1].address, 1, 2, 4);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);

      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);
    });

    it('increment account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._incrementUserAccount(ACCOUNTS[1].address, 1, 2, 4);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);

      await CONTRACT.connect(ACCOUNTS[0])._incrementUserAccount(ACCOUNTS[1].address, 3, 3, 3);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(4);
      expect(account.nftCommission).to.be.equal(5);
      expect(account.collectionCommission).to.be.equal(7);
    });
    it('increment one account out of many', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[3].address);

      await CONTRACT.connect(ACCOUNTS[0])._updateUserAccount(ACCOUNTS[1].address, 1, 2, 4);
      await CONTRACT.connect(ACCOUNTS[0])._incrementUserAccount(ACCOUNTS[1].address, 5, 4, 2);

      const account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(6);
      expect(account.nftCommission).to.be.equal(6);
      expect(account.collectionCommission).to.be.equal(6);

      const accounts = await CONTRACT.connect(ACCOUNTS[0])._getUserAccounts(
        [ACCOUNTS[1].address, ACCOUNTS[2].address, ACCOUNTS[3].address]
      );
      expect(accounts.length).to.be.equal(3);

      expect(accounts[0].id).to.be.equal(ACCOUNTS[1].address);
      expect(accounts[0].general).to.be.equal(6);
      expect(accounts[0].nftCommission).to.be.equal(6);
      expect(accounts[0].collectionCommission).to.be.equal(6);

      expect(accounts[1].id).to.be.equal(ACCOUNTS[2].address);
      expect(accounts[1].general).to.be.equal(0);
      expect(accounts[1].nftCommission).to.be.equal(0);
      expect(accounts[1].collectionCommission).to.be.equal(0);

      expect(accounts[2].id).to.be.equal(ACCOUNTS[3].address);
      expect(accounts[2].general).to.be.equal(0);
      expect(accounts[2].nftCommission).to.be.equal(0);
      expect(accounts[2].collectionCommission).to.be.equal(0);
    });

    it('nullify account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._updateUserAccount(ACCOUNTS[1].address, 1, 2, 4);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(1);
      expect(account.nftCommission).to.be.equal(2);
      expect(account.collectionCommission).to.be.equal(4);

      await CONTRACT.connect(ACCOUNTS[0])._nullifyUserAccount(ACCOUNTS[1].address);

      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);
    });

    it('remove account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);

      let account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(ACCOUNTS[1].address);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._removeUserAccount(ACCOUNTS[1].address);
      
      account = await CONTRACT.connect(ACCOUNTS[0])._getUserAccount(ACCOUNTS[1].address);
      expect(account.id).to.be.equal(EMPTY_ADDRESS);
      expect(account.general).to.be.equal(0);
      expect(account.nftCommission).to.be.equal(0);
      expect(account.collectionCommission).to.be.equal(0);
    });
  });

  describe('account properties', async () => {
    beforeEach(async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addUserAccount(ACCOUNTS[1].address);
    });

    it('get general account', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getGeneralUserAccount(ACCOUNTS[1].address)).to.be.equal(0);
    });
    it('update general account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateGeneralUserAccount(ACCOUNTS[1].address, 1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getGeneralUserAccount(ACCOUNTS[1].address)).to.be.equal(1);
    });

    it('get commission account', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getNftCommissionUserAccount(ACCOUNTS[1].address)).to.be.equal(0);
    });
    it('update commission account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateNftCommissionUserAccount(ACCOUNTS[1].address, 1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getNftCommissionUserAccount(ACCOUNTS[1].address)).to.be.equal(1);
    });

    it('get collection commission account', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getCollectionCommissionUserAccount(ACCOUNTS[1].address)).to.be.equal(0);
    });
    it('update collection commission account', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateCollectionCommissionUserAccount(ACCOUNTS[1].address, 1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getCollectionCommissionUserAccount(ACCOUNTS[1].address)).to.be.equal(1);
    });
  });
});
