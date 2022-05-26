const _ = require('lodash');
const { assert, expect } = require('chai');
require('chai').use(require('chai-as-promised')).should();
const { ethers, upgrades } = require("hardhat");


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
describe("AvaxTrade - Bank", () => {
  before(async () => {
    ACCOUNTS = await ethers.getSigners();
  });

  beforeEach(async () => {
    const contractFactory = await ethers.getContractFactory("Bank");
    CONTRACT = await upgrades.deployProxy(contractFactory, [ACCOUNTS[0].address], { kind: 'uups' });
    await CONTRACT.deployed();
  });

  it('deploys successfully', async () => {
    const address = await CONTRACT.address;
    assert.notEqual(address, '');
    assert.notEqual(address, 0x0);
  });

  describe('Proxy testing', async () => {
    it('upgrade - not owner', async () => {
      const role = await CONTRACT.connect(ACCOUNTS[0]).ADMIN_ROLE();
      await CONTRACT.connect(ACCOUNTS[0]).renounceRole(role, ACCOUNTS[0].address);

      const contractFactory = await ethers.getContractFactory("Bank");
      await upgrades.upgradeProxy(CONTRACT.address, contractFactory)
        .should.be.rejectedWith('AccessControl: account 0xda121ab48c7675e4f25e28636e3efe602e49eec6 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
  });

  describe('Bank owner', async () => {
    // address[] private BANK_OWNERS;

    it('get bank owners', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('add bank owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addBankOwner(ACCOUNTS[1].address);
      const result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(result).to.deep.include(ACCOUNTS[1].address);
    });
    it('is bank owner unique', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addBankOwner(ACCOUNTS[1].address);
      expect(await CONTRACT.connect(ACCOUNTS[0]).isBankOwnerUnique(ACCOUNTS[1].address)).to.be.false;
      expect(await CONTRACT.connect(ACCOUNTS[0]).isBankOwnerUnique(ACCOUNTS[2].address)).to.be.true;
    });
    it('remove bank owner - one user', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(result).to.deep.include(ACCOUNTS[1].address);

      await CONTRACT.connect(ACCOUNTS[0])._removeBankOwner(ACCOUNTS[1].address);

      result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('remove bank owner - two same users', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(result).to.deep.include(ACCOUNTS[1].address);

      await CONTRACT.connect(ACCOUNTS[0])._removeBankOwner(ACCOUNTS[1].address);

      result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('remove bank owner - two different users', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(result).to.deep.include(ACCOUNTS[1].address);

      await CONTRACT.connect(ACCOUNTS[0])._removeBankOwner(ACCOUNTS[1].address);

      result = await CONTRACT.connect(ACCOUNTS[0]).getBankOwners();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ACCOUNTS[2].address)).to.be.true;
      expect(await CONTRACT.connect(ACCOUNTS[0]).isBankOwnerUnique(ACCOUNTS[1].address)).to.be.true;
      expect(await CONTRACT.connect(ACCOUNTS[0]).isBankOwnerUnique(ACCOUNTS[2].address)).to.be.false;
    });
  });

  describe('Main functions', async () => {
    // {
    //   address id; // owner of this bank account
    //   UserAccountDS user; // user account
    //   CollectionAccountDS collection; // collection account
    //   VaultDS vault; // bank vault
    // }

    it('get all banks', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0]).getBanks([ACCOUNTS[1].address, ACCOUNTS[2].address])
      .should.be.rejectedWith('A user in the list does not own a bank');
    });
    it('get bank 1 - does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      const bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, EMPTY_ADDRESS)).to.be.true;
      expect(_doesArrayInclude(bank.collection, EMPTY_ADDRESS)).to.be.true;
      expect(_doesArrayInclude(bank.vault, EMPTY_ADDRESS)).to.be.true;
    });

    it('add bank', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      const bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;

      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(0);
      const reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;

      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);
    });
    it('add multiple same banks', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      const bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;

      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(0);
      const reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;

      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);
    });
    it('add multiple different banks', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[2].address);
      expect(bank.id).to.be.equal(ACCOUNTS[2].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[2].address)).to.be.true;
      expect(_doesArrayInclude(bank.collection, ACCOUNTS[2].address)).to.be.true;
      expect(_doesArrayInclude(bank.vault, ACCOUNTS[2].address)).to.be.true;

      const banks = await CONTRACT.connect(ACCOUNTS[0]).getBanks([ACCOUNTS[1].address, ACCOUNTS[2].address]);
      expect(banks.length).to.be.equal(2);

      expect(banks[0].user.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].user.general).to.be.equal(0);
      expect(banks[0].user.collectionCommission).to.be.equal(0);
      expect(banks[0].collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].collection.incentiveVault).to.be.equal(0);
      expect(banks[0].collection.supply).to.be.equal(0);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;
      expect(banks[0].vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].vault.balance).to.be.equal(0);

      expect(banks[1].user.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].user.general).to.be.equal(0);
      expect(banks[1].user.collectionCommission).to.be.equal(0);
      expect(banks[1].collection.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].collection.incentiveVault).to.be.equal(0);
      expect(banks[0].collection.supply).to.be.equal(0);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;
      expect(banks[1].vault.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].vault.balance).to.be.equal(0);
    });

    it('update brank - collection account not initialized', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);

      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(0);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5)
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('update brank', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[1].address, 3);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);

      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(3);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5);

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);

      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(1);
      expect(bank.user.nftCommission).to.be.equal(2);
      expect(bank.user.collectionCommission).to.be.equal(3);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(4);
      expect(bank.collection.supply).to.be.equal(3);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('1'), ethers.BigNumber.from('2'), ethers.BigNumber.from('3')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(5);
    });
    it('update brank - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[1].address, 3);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);

      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(3);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[1]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('update one bank out of many', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[3].address);

      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[1].address, 3);

      await CONTRACT.connect(ACCOUNTS[0]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5);

      const banks = await CONTRACT.connect(ACCOUNTS[0]).getBanks(
        [ACCOUNTS[1].address, ACCOUNTS[2].address, ACCOUNTS[3].address]
      );
      expect(banks.length).to.be.equal(3);

      expect(banks[0].user.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].user.general).to.be.equal(1);
      expect(banks[0].user.nftCommission).to.be.equal(2);
      expect(banks[0].user.collectionCommission).to.be.equal(3);
      expect(banks[0].collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].collection.incentiveVault).to.be.equal(4);
      expect(banks[0].collection.supply).to.be.equal(3);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(banks[0].collection.reflectionVault, [
        ethers.BigNumber.from('1'), ethers.BigNumber.from('2'), ethers.BigNumber.from('3')
      ])).to.be.true;
      expect(banks[0].vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(banks[0].vault.balance).to.be.equal(5);

      expect(banks[1].user.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].user.general).to.be.equal(0);
      expect(banks[1].user.collectionCommission).to.be.equal(0);
      expect(banks[1].collection.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].collection.incentiveVault).to.be.equal(0);
      expect(banks[1].collection.supply).to.be.equal(0);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[2].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;
      expect(banks[1].vault.id).to.be.equal(ACCOUNTS[2].address);
      expect(banks[1].vault.balance).to.be.equal(0);

      expect(banks[2].user.id).to.be.equal(ACCOUNTS[3].address);
      expect(banks[2].user.general).to.be.equal(0);
      expect(banks[2].user.collectionCommission).to.be.equal(0);
      expect(banks[2].collection.id).to.be.equal(ACCOUNTS[3].address);
      expect(banks[2].collection.incentiveVault).to.be.equal(0);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[3].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;
      expect(banks[2].vault.id).to.be.equal(ACCOUNTS[3].address);
      expect(banks[2].vault.balance).to.be.equal(0);
    });
    it('update bank then add same bank', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[1].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(1);
      expect(bank.user.nftCommission).to.be.equal(2);
      expect(bank.user.collectionCommission).to.be.equal(3);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(4);
      expect(bank.collection.supply).to.be.equal(3);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('1'), ethers.BigNumber.from('2'), ethers.BigNumber.from('3')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(5);

      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(1);
      expect(bank.user.nftCommission).to.be.equal(2);
      expect(bank.user.collectionCommission).to.be.equal(3);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(4);
      expect(bank.collection.supply).to.be.equal(3);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('1'), ethers.BigNumber.from('2'), ethers.BigNumber.from('3')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(5);
    });

    it('nullify brank', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.nftCommission).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(0);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[1].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).updateBank(ACCOUNTS[1].address, 1, 2, 3, [1,2,3], 4, 5);

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(1);
      expect(bank.user.nftCommission).to.be.equal(2);
      expect(bank.user.collectionCommission).to.be.equal(3);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(4);
      expect(bank.collection.supply).to.be.equal(3);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('1'), ethers.BigNumber.from('2'), ethers.BigNumber.from('3')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(5);

      await CONTRACT.connect(ACCOUNTS[0])._nullifyBank(ACCOUNTS[1].address);

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.nftCommission).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(3);
      reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(reflectionAccount, [
        ethers.BigNumber.from('0'), ethers.BigNumber.from('0'), ethers.BigNumber.from('0')
      ])).to.be.true;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);
    });

    it('remove brank', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);

      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, ACCOUNTS[1].address)).to.be.true;
      expect(bank.user.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.user.general).to.be.equal(0);
      expect(bank.user.collectionCommission).to.be.equal(0);

      expect(_doesArrayInclude(bank.collection, ACCOUNTS[1].address)).to.be.true;
      expect(bank.collection.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.collection.incentiveVault).to.be.equal(0);
      expect(bank.collection.supply).to.be.equal(0);
      let reflectionAccount = await CONTRACT.connect(ACCOUNTS[0]).getReflectionVaultCollectionAccount(ACCOUNTS[1].address);
      expect(reflectionAccount).to.be.an('array').that.is.empty;

      expect(_doesArrayInclude(bank.vault, ACCOUNTS[1].address)).to.be.true;
      expect(bank.vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(bank.vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._removeBank(ACCOUNTS[1].address);

      bank = await CONTRACT.connect(ACCOUNTS[0]).getBank(ACCOUNTS[1].address);
      expect(bank.id).to.be.equal(ACCOUNTS[1].address);
      expect(_doesArrayInclude(bank.user, EMPTY_ADDRESS)).to.be.true;
      expect(_doesArrayInclude(bank.collection, EMPTY_ADDRESS)).to.be.true;
      expect(_doesArrayInclude(bank.vault, EMPTY_ADDRESS)).to.be.true;
    });
  });

  describe('Monetary functions', async () => {

    it('claim general reward user account - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).claimGeneralRewardUserAccount(ACCOUNTS[1].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('claim general reward user account - owner account does not exist', async () => {
      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimGeneralRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim general reward user account - no balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimGeneralRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim general reward user account - yes balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).incrementUserAccount(ACCOUNTS[1].address, ethers.utils.parseEther('5'), 0, 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimGeneralRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });

    it('claim nft commission reward user account - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).claimNftCommissionRewardUserAccount(ACCOUNTS[1].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('claim nft commission reward user account - owner account does not exist', async () => {
      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimNftCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim nft commission reward user account - no balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getNftCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimNftCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getNftCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim nft commission reward user account - yes balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).incrementUserAccount(ACCOUNTS[1].address, 0, ethers.utils.parseEther('5'), 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getNftCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimNftCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getNftCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });

    it('claim collection commission reward user account - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).claimCollectionCommissionRewardUserAccount(ACCOUNTS[1].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('claim collection commission reward user account - owner account does not exist', async () => {
      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimCollectionCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getGeneralUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim collection commission reward user account - no balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getCollectionCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimCollectionCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getCollectionCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim collection commission reward user account - yes balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0]).incrementUserAccount(ACCOUNTS[1].address, 0, 0, ethers.utils.parseEther('5'));

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getCollectionCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimCollectionCommissionRewardUserAccount(ACCOUNTS[1].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getCollectionCommissionUserAccount(ACCOUNTS[1].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });

    it('claim reflection reward collection account - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).claimReflectionRewardCollectionAccount(2, ACCOUNTS[2].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('claim reflection reward collection account - owner account does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(2, ACCOUNTS[2].address)
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('claim reflection reward collection account - bank exists - vault not initialized', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(1, ACCOUNTS[2].address)
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('claim reflection reward collection account - bank & vault exists - token id out of bounds', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(400, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(400, ACCOUNTS[2].address);
      
      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(400, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim reflection reward collection account - invalid token id', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(0, ACCOUNTS[2].address)
        .should.be.rejectedWith('Bank: Invalid token id provided');
    });
    it('claim reflection reward collection account - no balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim reflection reward collection account - yes balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, ethers.utils.parseEther('5'), 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });

    it('claim reflection reward list collection account - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).claimReflectionRewardListCollectionAccount([1,2], ACCOUNTS[2].address)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('claim reflection reward list collection account - owner account does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([1,2], ACCOUNTS[2].address)
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('claim reflection reward list collection account - bank exists - vault not initialized', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([1,2], ACCOUNTS[2].address)
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('claim reflection reward list collection account - bank & vault exists - token id out of bounds', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(400, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([400], ACCOUNTS[2].address);
      
      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(400, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim reflection reward list collection account - empty token id list', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([], ACCOUNTS[2].address)
        .should.be.rejectedWith('Bank: Token id list is empty');
    });
    it('claim reflection reward list collection account - invalid token id', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([0], ACCOUNTS[2].address)
        .should.be.rejectedWith('Bank: Invalid token id provided');
    });
    it('claim reflection reward list collection account - no balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      balance = await CONTRACT.connect(ACCOUNTS[0]).callStatic.claimReflectionRewardListCollectionAccount([1,2,3], ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([1,2,3], ACCOUNTS[2].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('claim reflection reward collection account - yes balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, ethers.utils.parseEther('5'), 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      balance = await CONTRACT.connect(ACCOUNTS[0]).callStatic.claimReflectionRewardListCollectionAccount([1,2,3], ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('15.0');
      await CONTRACT.connect(ACCOUNTS[0]).claimReflectionRewardListCollectionAccount([1,2,3], ACCOUNTS[2].address);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });

    it('distribute collection reflection - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).distributeCollectionReflectionReward(ACCOUNTS[2].address, 3, ethers.utils.parseEther('6'))
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('distribute collection reflection - account does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionReward(ACCOUNTS[2].address, 3, ethers.utils.parseEther('6'))
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('distribute collection reflection - no existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      // distribute 2 ether among 3 users
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionReward(ACCOUNTS[2].address, 3, ethers.utils.parseEther('6'));

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('2.0');
    });
    it('distribute collection reflection - yes existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, ethers.utils.parseEther('5'), 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      // distribute 2 ether among 3 users
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionReward(ACCOUNTS[2].address, 3, ethers.utils.parseEther('3'));
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionReward(ACCOUNTS[2].address, 3, ethers.utils.parseEther('6'));

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('8.0');
    });

    it('distribute collection reflection given list - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).distributeCollectionReflectionRewardList(ACCOUNTS[2].address, [1,3], ethers.utils.parseEther('10'))
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('distribute collection reflection given list - account does not exist', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionRewardList(ACCOUNTS[2].address, [1,3], ethers.utils.parseEther('10'))
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('distribute collection reflection given list - no existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      // distribute 10 ether among 2 users
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionRewardList(ACCOUNTS[2].address, [1,3], ethers.utils.parseEther('10'))

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
    });
    it('distribute collection reflection given list - yes existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, ethers.utils.parseEther('5'), 0);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      // distribute 10 ether among 2 users
      await CONTRACT.connect(ACCOUNTS[0]).distributeCollectionReflectionRewardList(ACCOUNTS[2].address, [1,3], ethers.utils.parseEther('10'))

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(1, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('10.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(2, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getReflectionRewardCollectionAccount(3, ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('10.0');
    });

    it('update collection incentive reward - vault not initialized', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, 0, ethers.utils.parseEther('4'))
        .should.be.rejectedWith('Collection account not initialized');
    });
    it('update collection incentive reward - increase - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), true)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('update collection incentive reward - decrease - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), false)
        .should.be.rejectedWith('AccessControl: account 0xc0e62f2f7fdfff0679ab940e29210e229cdcb8ed is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
    it('update collection incentive reward - increase - account does not exist', async () => {
      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), true);
        // .should.be.rejectedWith('The account for this collection does not exist');
      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
    });
    it('update collection incentive reward - decrease - account does not exist', async () => {
      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), false)
        .should.be.rejectedWith('Bank: Withdraw amount must be less than or equal to vault balance');
    });
    it('update collection incentive reward - increase - no existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), true);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');
    });
    it('update collection incentive reward - increase - yes existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, 0, ethers.utils.parseEther('4'));

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), true);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('9.0');
    });
    it('update collection incentive reward - decrease - no existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), false)
        .should.be.rejectedWith('Bank: Withdraw amount must be less than or equal to vault balance');
    });
    it('update collection incentive reward - decrease - yes existing balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, 0, ethers.utils.parseEther('5'));

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('4'), false);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('1.0');
    });
    it('update collection incentive reward - decrease - yes existing balance - all', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, 0, ethers.utils.parseEther('5'));

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('5.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), false);

      balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
    });
    it('update collection incentive reward - decrease - yes existing balance - overdraft', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).addBank(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0]).initReflectionVaultCollectionAccount(ACCOUNTS[2].address, 3);
      await CONTRACT.connect(ACCOUNTS[0]).incrementCollectionAccount(ACCOUNTS[2].address, 0, ethers.utils.parseEther('4'));

      let balance = await CONTRACT.provider.getBalance(CONTRACT.address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('0.0');
      balance = await CONTRACT.connect(ACCOUNTS[0]).getIncentiveVaultCollectionAccount(ACCOUNTS[2].address);
      expect(ethers.utils.formatEther(balance)).to.be.equal('4.0');

      await CONTRACT.connect(ACCOUNTS[0]).updateCollectionIncentiveReward(ACCOUNTS[2].address, ethers.utils.parseEther('5'), false)
        .should.be.rejectedWith('Bank: Withdraw amount must be less than or equal to vault balance');
    });

  });

});
