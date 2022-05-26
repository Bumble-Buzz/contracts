const { ethers } = require("hardhat");
const BankAbi = require('../artifacts/contracts/bank/Bank.sol/Bank.json');
const SaleAbi = require('../artifacts/contracts/sale/Sale.sol/Sale.json');
const CollectionAbi = require('../artifacts/contracts/collectionItem/CollectionItem.sol/CollectionItem.json');
const LOCAL_RPC = 'http://localhost:8545';


const collection = async (_provider) => {
  const contract = new ethers.Contract(process.env.NEXT_PUBLIC_COLLECTION_ITEM_CONTRACT_ADDRESS, CollectionAbi.abi, _provider);
  const onChainData = await contract.getCollection(Number(3));
  console.log('onChainData', onChainData);
};

const bankReflectionVault = async (_provider) => {
  const contract = new ethers.Contract(process.env.NEXT_PUBLIC_BANK_CONTRACT_ADDRESS, BankAbi.abi, _provider);
  const onChainData = await contract.getReflectionVaultCollectionAccount('0xBDDf875B6f5Aa1C64aEA75c3bDf19b2b46215E29');
  const tokenId = 2;
  const reflectionId = tokenId-1;
  const reflectionInt = Number(onChainData[reflectionId]);
  const reflectionClaim = Number(ethers.utils.formatEther(reflectionInt.toString()));
  console.log('onChainData', reflectionClaim);
};
const bank = async (_provider) => {
  bankReflectionVault(_provider)
};


(async () => {
  const provider = new ethers.providers.JsonRpcProvider(LOCAL_RPC);

  // await collection(provider);
  await bank(provider);

  console.log('end');
})();
