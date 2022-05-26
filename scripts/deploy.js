const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");

let ACCOUNTS;
let CONTRACT_FACTORY;
let CONTRACT = { address: '0x6679CdE5195A15bacbDDDAeBb170d865DBA7838B' };
// let CONTRACT;
let BANK_CONTRACT;
let SALE_CONTRACT;
let COLLECTION_ITEM_CONTRACT;
let NFT_CONTRACT;
let SAMPLE_NFT_CONTRACT;
let TEST_NFT_CONTRACTS;

async function main() {
  await getAccounts();

  // await avaxTrade();
  // console.log("AvaxTrade deployed to:", CONTRACT.address);
  // await bank();
  // console.log("Bank deployed to:", BANK_CONTRACT.address);
  // await sale();
  // console.log("Sale deployed to:", SALE_CONTRACT.address);
  await collectionItem();
  console.log("Collection Item deployed to:", COLLECTION_ITEM_CONTRACT.address);
  // await updateAvaxTrade();
  // console.log("Updated AvaxTrade with contracts:", BANK_CONTRACT.address, SALE_CONTRACT.address, COLLECTION_ITEM_CONTRACT.address);
  // await avaxTradeNft();
  // console.log("AvaxTradeNft deployed to:", NFT_CONTRACT.address);
  // await SampleErc721();
  // console.log("Sample NFT Contract deployed to:", SAMPLE_NFT_CONTRACT.address);


  // update AvaxTrade with sibling contracts
  // const avaxTradeContract = await ethers.getContractAt("AvaxTrade", '0x1f8700f3D074a8999D7ef9a0e292542C1a3463E4');
  // console.log('contracts', await avaxTradeContract.connect(ACCOUNTS[0]).getContracts());
  // await avaxTradeContract.connect(ACCOUNTS[0]).setContracts(
  //   '0xB75CE57645626d3511Bd933f39e4F652d9BfD5E3', '0x5D20E204a01C8156b0E4b877a2339904cfd8735a', '0xDf3bc1dCBBF6220C97c04191DEf9560Cb3A47829'
  // );
  // console.log('contracts', await avaxTradeContract.connect(ACCOUNTS[0]).getContracts());

  // await TestErc721();
}

// todo use actual account when deploying to mainnet chain
const getAccounts = async () => {
  return ACCOUNTS = await ethers.getSigners();
};

const avaxTrade = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("AvaxTrade");
  CONTRACT = await upgrades.deployProxy(CONTRACT_FACTORY, [ACCOUNTS[0].address], { kind: 'uups' });
  await CONTRACT.deployed();
  const implementationAddress = await CONTRACT.connect(ACCOUNTS[0]).getImplementation();
  console.log("AvaxTrade deployed to:", CONTRACT.address, implementationAddress);
};

const bank = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("Bank");
  BANK_CONTRACT = await upgrades.deployProxy(CONTRACT_FACTORY, [CONTRACT.address], { kind: 'uups' });
  await BANK_CONTRACT.deployed();
};

const sale = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("Sale");
  SALE_CONTRACT = await upgrades.deployProxy(CONTRACT_FACTORY, [CONTRACT.address, ACCOUNTS[0].address], { kind: 'uups' });
  await SALE_CONTRACT.deployed();
};

const collectionItem = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("CollectionItem");
  COLLECTION_ITEM_CONTRACT = await upgrades.deployProxy(CONTRACT_FACTORY, [CONTRACT.address, ACCOUNTS[0].address], { kind: 'uups' });
  await COLLECTION_ITEM_CONTRACT.deployed();
};

// update AvaxTrade with sibling contracts
const updateAvaxTrade = async () => {
  await CONTRACT.connect(ACCOUNTS[0]).setContracts(BANK_CONTRACT.address, SALE_CONTRACT.address, COLLECTION_ITEM_CONTRACT.address);
};

const avaxTradeNft = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("AvaxTradeNft");
  NFT_CONTRACT = await CONTRACT_FACTORY.deploy('Local AvaxTrade', 'LAX', 'ipfs://');
  await NFT_CONTRACT.deployed();
};

const SampleErc721 = async () => {
  CONTRACT_FACTORY = await ethers.getContractFactory("SampleErc721");
  SAMPLE_NFT_CONTRACT = await CONTRACT_FACTORY.deploy();
  await SAMPLE_NFT_CONTRACT.deployed();
};

const TestErc721 = async () => {
  for (let i = 0; i < 9; i++) {
    CONTRACT_FACTORY = await ethers.getContractFactory("TestErc721");
    TEST_NFT_CONTRACTS = await CONTRACT_FACTORY.deploy(`TestErc721 - ${i}`, `Test${i}`);
    await TEST_NFT_CONTRACTS.deployed();
    console.log(`Test NFT Contract ${i} deployed to:`, TEST_NFT_CONTRACTS.address);
  }
};


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
