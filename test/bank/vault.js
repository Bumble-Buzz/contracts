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
describe("AvaxTrade - Vault", () => {
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
    //   address id; // owner of this vault
    //   uint256 balance; // any general reward balance
    // }

    it('get vaults', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._getVaults([ACCOUNTS[1].address, ACCOUNTS[2].address])
        .should.be.rejectedWith('A vault in the list does not exist');
    });
    it('get vault 1 - does not exist', async () => {
      const vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(EMPTY_ADDRESS);
      expect(vault.balance).to.be.equal(0);
    });

    it('add vault', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      const vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);
    });
    it('add multiple same vaults', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      const vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);
    });
    it('add multiple different vaults', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[2].address);

      let vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[2].address);
      expect(vault.id).to.be.equal(ACCOUNTS[2].address);
      expect(vault.balance).to.be.equal(0);

      const vaults = await CONTRACT.connect(ACCOUNTS[0])._getVaults([ACCOUNTS[1].address, ACCOUNTS[2].address]);
      expect(vaults.length).to.be.equal(2);

      expect(vaults[0].id).to.be.equal(ACCOUNTS[1].address);
      expect(vaults[0].balance).to.be.equal(0);

      expect(vaults[1].id).to.be.equal(ACCOUNTS[2].address);
      expect(vaults[1].balance).to.be.equal(0);
    });

    it('update vault', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      let vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._updateVault(ACCOUNTS[1].address, 1);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(1);
    });
    it('update one vault out of many', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[2].address);
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[3].address);

      await CONTRACT.connect(ACCOUNTS[0])._updateVault(ACCOUNTS[1].address, 1);

      const vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(1);

      const vaults = await CONTRACT.connect(ACCOUNTS[0])._getVaults(
        [ACCOUNTS[1].address, ACCOUNTS[2].address, ACCOUNTS[3].address]
      );
      expect(vaults.length).to.be.equal(3);

      expect(vaults[0].id).to.be.equal(ACCOUNTS[1].address);
      expect(vaults[0].balance).to.be.equal(1);

      expect(vaults[1].id).to.be.equal(ACCOUNTS[2].address);
      expect(vaults[1].balance).to.be.equal(0);

      expect(vaults[2].id).to.be.equal(ACCOUNTS[3].address);
      expect(vaults[2].balance).to.be.equal(0);
    });
    it('update vault then add same vault', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);
      await CONTRACT.connect(ACCOUNTS[0])._updateVault(ACCOUNTS[1].address, 1);

      let vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(1);

      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(1);
    });

    it('nullify vault', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      let vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._updateVault(ACCOUNTS[1].address, 1);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(1);

      await CONTRACT.connect(ACCOUNTS[0])._nullifyVault(ACCOUNTS[1].address);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);
    });

    it('remove vault', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);

      let vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(ACCOUNTS[1].address);
      expect(vault.balance).to.be.equal(0);

      await CONTRACT.connect(ACCOUNTS[0])._removeVault(ACCOUNTS[1].address);

      vault = await CONTRACT.connect(ACCOUNTS[0])._getVault(ACCOUNTS[1].address);
      expect(vault.id).to.be.equal(EMPTY_ADDRESS);
      expect(vault.balance).to.be.equal(0);
    });
  });

  describe('vault properties', async () => {
    beforeEach(async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addVault(ACCOUNTS[1].address);
    });

    it('get general balance', async () => {
      expect(await CONTRACT.connect(ACCOUNTS[0])._getVaultBalance(ACCOUNTS[1].address)).to.be.equal(0);
    });
    it('update general balance', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._updateVaultBalance(ACCOUNTS[1].address, 1);
      expect(await CONTRACT.connect(ACCOUNTS[0])._getVaultBalance(ACCOUNTS[1].address)).to.be.equal(1);
    });
  });
});
