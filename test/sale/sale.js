const _ = require('lodash');
const { assert, expect } = require('chai');
require('chai').use(require('chai-as-promised')).should();
const { ethers, upgrades } = require("hardhat");


// global variables
let ACCOUNTS = [];
let CONTRACT;

// global functions
const _doesArrayInclude = (_array, _identifier = {}) => {
  const foundDna = _array.find((arrayElement) => {
      return _.isEqual(arrayElement, _identifier);
  });
  return foundDna == undefined ? false : true;
};
const _doesArrayExpect = (_array, _identifier = {}) => {
  const foundDna = _array.find((arrayElement) => {
      return expect(arrayElement).to.be.equal(_identifier);
  });
  return foundDna == undefined ? false : true;
};
const _doesArrayEqual = (_array, expectedArray = []) => {
  return _(_array).differenceWith(expectedArray, _.isEqual).isEmpty();
};
describe("AvaxTrade - Sale", () => {
  before(async () => {
    ACCOUNTS = await ethers.getSigners();
  });

  beforeEach(async () => {
    const contractFactory = await ethers.getContractFactory("Sale");
    CONTRACT = await upgrades.deployProxy(contractFactory, [ACCOUNTS[0].address, ACCOUNTS[1].address], { kind: 'uups' });
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

      const contractFactory = await ethers.getContractFactory("Sale");
      await upgrades.upgradeProxy(CONTRACT.address, contractFactory)
        .should.be.rejectedWith('AccessControl: account 0xda121ab48c7675e4f25e28636e3efe602e49eec6 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775');
    });
  });

  describe('Sale items', async () => {
    // uint256[] private SALE_ITEMS;

    it('get total sale item ids', async () => {
      const result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('add total sale item id', async () => {
      await CONTRACT.connect(ACCOUNTS[0])._addTotalSaleItemId(123);
      const result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('remove total sale item id - one item', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(1);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('1')])).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeTotalSaleItemId(1);

      result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.empty;
    });
    it('remove total sale item id - two items', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(1);
      await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(2);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('1'),ethers.BigNumber.from('2')])).to.be.true;

      await CONTRACT.connect(ACCOUNTS[0])._removeTotalSaleItemId(1);

      result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayInclude(result, ethers.BigNumber.from('2'))).to.be.true;
    });
  });

  describe('Access Control Check', async () => {

    it('create empty sale - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createEmptySale(123).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create empty sale - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createEmptySale(123);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create empty sale - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(123);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create direct sale - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSaleDirect(123, ACCOUNTS[1].address).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create direct sale - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSaleDirect(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create direct sale - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSaleDirect(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create immediate sale - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSaleImmediate(123, ACCOUNTS[1].address).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create immediate sale - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSaleImmediate(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create immediate sale - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSaleImmediate(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create auction sale - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSaleAuction(123, ACCOUNTS[1].address).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create auction sale - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSaleAuction(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create auction sale - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSaleAuction(123, ACCOUNTS[1].address);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create sale - direct - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSale(123, ACCOUNTS[1].address, 0).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create sale - direct - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSale(123, ACCOUNTS[1].address, 0);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create sale - direct - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 0);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create sale - immediate - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSale(123, ACCOUNTS[1].address, 1).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create sale - immediate - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSale(123, ACCOUNTS[1].address, 1);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create sale - immediate - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 1);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

    it('create sale - auction - not owner', async () => {
      await CONTRACT.connect(ACCOUNTS[2]).createSale(123, ACCOUNTS[1].address, 2).should.be.rejectedWith(
        'AccessControl: account 0x5ca6ec5718ac9ac8916b8cecab2c0d6051dbba92 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
      );
    });
    it('create sale - auction - yes owner', async () => {
      await CONTRACT.connect(ACCOUNTS[1]).createSale(123, ACCOUNTS[1].address, 2);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });
    it('create sale - auction - yes admin', async () => {
      await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 2);

      let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
      expect(result).to.be.an('array').that.is.not.empty;
      expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
    });

  });

  describe('Main functions', async () => {
    // mapping(uint256 => SaleDS) private SALES;

    describe('is valid - init', async () => {
      it('is direct sale valid', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)
          .should.be.rejectedWith('The sale does not exist');
      });
      it('is immediate sale valid', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)
          .should.be.rejectedWith('The sale does not exist');
      });
      it('is auction sale valid', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)
          .should.be.rejectedWith('The sale does not exist');
      });
      it('is sale valid', async () => {
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.false;
      });
    });

    describe('get sales - init', async () => {
      it('get all direct sales', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.empty;
      });
      it('get all immediate sales', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.empty;
      });
      it('get all auction sales', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.empty;
      });
      it('get all sales', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[],[]])).to.be.true;
      });
    });

    describe('get sales for user - init', async () => {
      it('direct sales', async () => {
        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
      });
      it('immediate sales', async () => {
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
      });
      it('auction sales', async () => {
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
      });
      it('all sales for user', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[],[]])).to.be.true;
      });
      it('all sales for users', async () => {
        const result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        const expectedArr = [ [ACCOUNTS[1].address,[],[],[]], [ACCOUNTS[2].address,[],[],[]] ];
        expect(_doesArrayEqual(result, expectedArr)).to.be.true;
      });
    });

    describe('create sales - init', async () => {
      it('create empty sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(1);
        await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(1)
          .should.be.rejectedWith('Sale already exists');
      });
      it('create direct sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleDirect(1, ACCOUNTS[1].address);
        await CONTRACT.connect(ACCOUNTS[0]).createSaleDirect(1, ACCOUNTS[1].address)
          .should.be.rejectedWith('Sale already exists - Direct');
      });
      it('create immediate sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleImmediate(1, ACCOUNTS[1].address);
        await CONTRACT.connect(ACCOUNTS[0]).createSaleImmediate(1, ACCOUNTS[1].address)
          .should.be.rejectedWith('Sale already exists - Immediate');
      });
      it('create auction sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleAuction(1, ACCOUNTS[1].address);
        await CONTRACT.connect(ACCOUNTS[0]).createSaleAuction(1, ACCOUNTS[1].address)
          .should.be.rejectedWith('Sale already exists - Auction');
      });
      it('create sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(1, ACCOUNTS[1].address, 0);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(1, ACCOUNTS[1].address, 0)
          .should.be.rejectedWith('Sale already exists');

        await CONTRACT.connect(ACCOUNTS[0]).createSale(1, ACCOUNTS[1].address, 1)
          .should.be.rejectedWith('Sale already exists');
        await CONTRACT.connect(ACCOUNTS[0]).createSale(2, ACCOUNTS[1].address, 1);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(2, ACCOUNTS[1].address, 1)
          .should.be.rejectedWith('Sale already exists');

        await CONTRACT.connect(ACCOUNTS[0]).createSale(2, ACCOUNTS[1].address, 1)
          .should.be.rejectedWith('Sale already exists');
        await CONTRACT.connect(ACCOUNTS[0]).createSale(3, ACCOUNTS[1].address, 2);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(3, ACCOUNTS[1].address, 2)
          .should.be.rejectedWith('Sale already exists');
      });
      it('create sale - invalid sale type', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(1, ACCOUNTS[1].address, 3)
          .should.be.rejectedWith('Transaction reverted: function was called with incorrect parameters');
      });
    });

    describe('remove sales - init', async () => {
      it('remove sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0])._removeSale(1, ACCOUNTS[1].address)
          .should.be.rejectedWith('The sale does not exist');
      });
    });

    describe('create sales', async () => {
      it('create empty sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createEmptySale(123);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[],[]])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[],[]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[],[],[]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create direct sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleDirect(123, ACCOUNTS[1].address);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[ethers.BigNumber.from('123')],[],[]])).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create immediate sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleImmediate(123, ACCOUNTS[1].address);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[ethers.BigNumber.from('123')],[]])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[ethers.BigNumber.from('123')],[]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[],[ethers.BigNumber.from('123')],[]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create auction sale', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSaleAuction(123, ACCOUNTS[1].address);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[],[ethers.BigNumber.from('123')]])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[],[ethers.BigNumber.from('123')]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[],[],[ethers.BigNumber.from('123')]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create sale - direct', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 0);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[ethers.BigNumber.from('123')],[],[]])).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create sale - immediate', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 1);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[ethers.BigNumber.from('123')],[]])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[ethers.BigNumber.from('123')],[]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[],[ethers.BigNumber.from('123')],[]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
      it('create sale - auction', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 2);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(123, ACCOUNTS[1].address)).to.be.false;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales()).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales()).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(result, [[],[],[ethers.BigNumber.from('123')]])).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        expect(await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address)).to.be.an('array').that.is.empty;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(result, [ACCOUNTS[1].address,[],[],[ethers.BigNumber.from('123')]])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(result, [ [ACCOUNTS[1].address,[],[],[ethers.BigNumber.from('123')]], [ACCOUNTS[2].address,[],[],[]] ])).to.be.true;
      });
    });

    describe('create sale - multiple sales - one user', async () => {
      it('direct, immediate, auction', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 0);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(456, ACCOUNTS[1].address, 1);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(789, ACCOUNTS[1].address, 2);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(
          result,
          [ethers.BigNumber.from('123'),ethers.BigNumber.from('456'),ethers.BigNumber.from('789')])
        ).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(456, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(789, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(456)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(789)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('456')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('789')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(
          result,
          [ [ethers.BigNumber.from('123')],[ethers.BigNumber.from('456')],[ethers.BigNumber.from('789')] ]
        )).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('456')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('789')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(
          result,
          [ ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[ethers.BigNumber.from('456')],[ethers.BigNumber.from('789')] ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(
          result,
          [
            [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[ethers.BigNumber.from('456')],[ethers.BigNumber.from('789')]],
            [ACCOUNTS[2].address,[],[],[]]
          ]
        )).to.be.true;
      });
      it('multiple sales', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(12, ACCOUNTS[1].address, 0);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(34, ACCOUNTS[1].address, 1);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(56, ACCOUNTS[1].address, 2);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(78, ACCOUNTS[1].address, 2);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(90, ACCOUNTS[1].address, 1);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(
          result,
          [
            ethers.BigNumber.from('12'),
            ethers.BigNumber.from('34'),
            ethers.BigNumber.from('56'),
            ethers.BigNumber.from('78'),
            ethers.BigNumber.from('90')
          ]
        )).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(12, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(34, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(90, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(56, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(78, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(12)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(34)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(56)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(78)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(90)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('12')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(
          result,
          [
            [ethers.BigNumber.from('12')],
            [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')],
            [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')]
          ]
        )).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('12')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(
          result,
          [
            ACCOUNTS[1].address,
            [ethers.BigNumber.from('12')],
            [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')],
            [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')]
          ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(
          result,
          [
            [
              ACCOUNTS[1].address,
              [ethers.BigNumber.from('12')],
              [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')],
              [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')]
            ],
            [ACCOUNTS[2].address,[],[],[]]
          ]
        )).to.be.true;
      });
    });

    describe('create sale - multiple sales - two users', async () => {
      it('direct, immediate, auction', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(123, ACCOUNTS[1].address, 0);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(456, ACCOUNTS[2].address, 1);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(789, ACCOUNTS[1].address, 2);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(
          result,
          [ethers.BigNumber.from('123'),ethers.BigNumber.from('456'),ethers.BigNumber.from('789')])
        ).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(123, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(456, ACCOUNTS[2].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(789, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(123)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(456)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(789)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('456')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('789')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(
          result,
          [ [ethers.BigNumber.from('123')],[ethers.BigNumber.from('456')],[ethers.BigNumber.from('789')] ]
        )).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('123')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[2].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('456')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('789')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(
          result,
          [ ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[ethers.BigNumber.from('789')] ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[2].address);
        expect(_doesArrayEqual(
          result,
          [ ACCOUNTS[2].address,[],[ethers.BigNumber.from('456')],[] ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(
          result,
          [
            [ACCOUNTS[1].address,[ethers.BigNumber.from('123')],[],[ethers.BigNumber.from('789')]],
            [ACCOUNTS[2].address,[],[ethers.BigNumber.from('456')],[]]
          ]
        )).to.be.true;
      });
      it('multiple sales', async () => {
        await CONTRACT.connect(ACCOUNTS[0]).createSale(12, ACCOUNTS[1].address, 0);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(34, ACCOUNTS[2].address, 1);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(56, ACCOUNTS[1].address, 2);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(78, ACCOUNTS[2].address, 2);
        await CONTRACT.connect(ACCOUNTS[0]).createSale(90, ACCOUNTS[1].address, 1);

        let result = await CONTRACT.connect(ACCOUNTS[0]).getTotalSaleItemIds();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(
          result,
          [
            ethers.BigNumber.from('12'),
            ethers.BigNumber.from('34'),
            ethers.BigNumber.from('56'),
            ethers.BigNumber.from('78'),
            ethers.BigNumber.from('90')
          ]
        )).to.be.true;

        expect(await CONTRACT.connect(ACCOUNTS[0]).isDirectSaleValid(12, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(34, ACCOUNTS[2].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isImmediateSaleValid(90, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(56, ACCOUNTS[1].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isAuctionSaleValid(78, ACCOUNTS[2].address)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(12)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(34)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(56)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(78)).to.be.true;
        expect(await CONTRACT.connect(ACCOUNTS[0]).isSaleValid(90)).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getAllDirectSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('12')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllImmediateSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllAuctionSales();
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAllSales();
        expect(_doesArrayEqual(
          result,
          [
            [ethers.BigNumber.from('12')],
            [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')],
            [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')]
          ]
        )).to.be.true;

        result = await CONTRACT.connect(ACCOUNTS[0]).getDirectSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('12')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getImmediateSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('34'),ethers.BigNumber.from('90')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getAuctionSalesForUser(ACCOUNTS[1].address);
        expect(result).to.be.an('array').that.is.not.empty;
        expect(_doesArrayEqual(result, [ethers.BigNumber.from('56'),ethers.BigNumber.from('78')])).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[1].address);
        expect(_doesArrayEqual(
          result,
          [
            ACCOUNTS[1].address,
            [ethers.BigNumber.from('12')],
            [ethers.BigNumber.from('90')],
            [ethers.BigNumber.from('56')]
          ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUser(ACCOUNTS[2].address);
        expect(_doesArrayEqual(
          result,
          [
            ACCOUNTS[2].address,
            [],
            [ethers.BigNumber.from('34')],
            [ethers.BigNumber.from('78')]
          ]
        )).to.be.true;
        result = await CONTRACT.connect(ACCOUNTS[0]).getSalesForUsers([ACCOUNTS[1].address, ACCOUNTS[2].address]);
        expect(_doesArrayEqual(
          result,
          [
            [
              ACCOUNTS[1].address,
              [ethers.BigNumber.from('12')],
              [ethers.BigNumber.from('90')],
              [ethers.BigNumber.from('56')]
            ],
            [
              ACCOUNTS[2].address,
              [],
              [ethers.BigNumber.from('34')],
              [ethers.BigNumber.from('78')]
            ]
          ]
        )).to.be.true;
      });
    });

  });

});
