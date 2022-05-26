const { ethers, upgrades } = require("hardhat");

let ACCOUNTS;
let CONTRACT_FACTORY;
let CONTRACT;
let BANK_CONTRACT;
let SALE_CONTRACT;
let COLLECTION_ITEM_CONTRACT;
let NFT_CONTRACT;

async function main() {
  console.log("Create script to upgrade contracts.");
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
