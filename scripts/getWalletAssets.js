const ethers = require('ethers').ethers;
const dotenv = require('dotenv').config();
const dotenvExpand = require('dotenv-expand');

const AvaxTradeNftAbi = require('../artifacts/contracts/AvaxTradeNft.sol/AvaxTradeNft.json');
const IERC721 = require('../artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json');
// import TestErc721 from '@bumblebuzz/contracts/artifacts/contracts/TestErc721.sol/TestErc721.json';

// use interpolation for .env variables
dotenvExpand(dotenv);

// const RPC_NODE = 'http://localhost:8545';
const RPC_NODE = process.env.INFURA_AURORA;
const NFT_CONTRACT_ADDRESS = '0xfeCB87A6aEf57A16234d1e0A1E5d11364734a31F';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const ERC721_ADDRESS = '0x8Fff0D9D6d3C320957F73310434649050465a59D';
const ERC1155_ADDRESS = '0x0000000000000000000000000000000000000000';
const WALLET_ADDRESS = '0xdA121aB48c7675E4F25E28636e3Efe602e49eec6';
const ERC_20_INTERFACE_ID = '0x36372b07';
const ERC_165_INTERFACE_ID = '0x01ffc9a7';
const ERC_721_INTERFACE_ID = '0x80ac58cd';
const ERC_1155_INTERFACE_ID = '0xd9b67a26';

const ERC_721_CONTRACTS = [];
const ERC_1155_CONTRACTS = [];


const main = async () => {
  console.log('start');
  console.log('');

  if (!RPC_NODE) { console.log('skipping blockchain check'); return true; }

  const provider = new ethers.providers.JsonRpcProvider(RPC_NODE);
  // const contract = new ethers.Contract(ethers.utils.getAddress(NFT_CONTRACT_ADDRESS), AvaxTradeNftAbi.abi, provider);

  const latestBlock = await provider.getBlockNumber();
  // const latestBlock = 66345450;
  console.log('latestBlock', latestBlock);
  let startingBlock = latestBlock-1;
  if (startingBlock < 0) startingBlock = 0;

  // let getBlock = await provider.getBlock(currentBlock);
  // console.log('getBlock', getBlock);

  // let getBlockWithTransactions = await provider.getBlockWithTransactions(currentBlock);
  // console.log('getBlockWithTransactions', getBlockWithTransactions);

  for (let currentBlock = startingBlock; currentBlock <= latestBlock; currentBlock++) {
    console.log("Searching block " + currentBlock);
    let block = await provider.getBlockWithTransactions(currentBlock);
    // console.log("block ", block);
    const transactions = block.transactions;

    // if block has no valid transactions, skip
    if (block === null || transactions === null || transactions.length <= 0) continue;

    for (let j=0; j < transactions.length; j++) {
      const transaction = transactions[j];
      // console.log('transaction', transaction);
      // console.log('transaction', transaction.hash, transaction.to, transaction.from, transaction.creates);

      // const txReceipt = await provider.getTransactionReceipt(transaction.hash);
      // console.log("txReceipt", txReceipt);
      // console.log("txReceipt logs", txReceipt.logs);

      // const addresses = [ transaction.to, transaction.from, transaction.creates ];
      const addresses = [ transaction.creates ];
      for (let i=0; i < addresses.length; i++) {
        const address = addresses[i];
        if (address === null || address === EMPTY_ADDRESS) continue;

        const contract = new ethers.Contract(address, IERC721.abi, provider);
        try {
          const is721 = await contract.callStatic.supportsInterface(ERC_721_INTERFACE_ID);
          if(is721) ERC_721_CONTRACTS.push(address);
          const is1155 = await contract.callStatic.supportsInterface(ERC_1155_INTERFACE_ID);
          if(is1155) ERC_1155_CONTRACTS.push(address);
        } catch (e) {
          // console.log("Not ERC721 or ERC1155");
        }
      }

      // const contractAddressTo = (transaction.to) ? transaction.to : EMPTY_ADDRESS;
      // const contractTo = new ethers.Contract(contractAddressTo, IERC721.abi, provider);
      // try {
      //   const is721 = await contractTo.callStatic.supportsInterface(ERC_721_INTERFACE_ID);
      //   if(is721) ERC_721_CONTRACTS.push(contractAddressTo);
      //   const is1155 = await contractTo.callStatic.supportsInterface(ERC_1155_INTERFACE_ID);
      //   if(is1155) ERC_1155_CONTRACTS.push(contractAddressTo);
      // } catch (e) {
      //   // console.log("Not ERC721 or ERC1155");
      // }

      // const contractAddressFrom = (transaction.from) ? transaction.from : EMPTY_ADDRESS;
      // const contractFrom = new ethers.Contract(contractAddressFrom, IERC721.abi, provider);
      // try {
      //   const is721 = await contractFrom.callStatic.supportsInterface(ERC_721_INTERFACE_ID);
      //   if(is721) ERC_721_CONTRACTS.push(contractAddressFrom);
      //   const is1155 = await contractFrom.callStatic.supportsInterface(ERC_1155_INTERFACE_ID);
      //   if(is1155) ERC_1155_CONTRACTS.push(contractAddressFrom);
      // } catch (e) {
      //   // console.log("Not ERC721 or ERC1155");
      // }
    }
  }

  console.log('ERC_721_CONTRACTS', ERC_721_CONTRACTS);
  console.log('ERC_1155_CONTRACTS', ERC_1155_CONTRACTS);

  // const contract = new ethers.Contract(ethers.utils.getAddress(ERC721_ADDRESS), IERC721.abi, provider);
  // // console.log('asd', IERC721.interfaceId);
  // // console.log('asd', contract.interfaceId);
  // try {
  //   const is721 = await contract.callStatic.supportsInterface(ERC_721_INTERFACE_ID);
  //   if(is721) console.log("ERC721");
  //   const is1155 = await contract.callStatic.supportsInterface(ERC_1155_INTERFACE_ID);
  //   if(is1155) console.log("ERC1155");
  // } catch (e) {
  //   console.log("Not ERC721 or ERC1155");
  // }

  console.log('');
  console.log('end');
};


main();
