require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
const dotenv = require('dotenv').config();
const dotenvExpand = require('dotenv-expand');

// use interpolation for .env variables
dotenvExpand(dotenv);

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: { enabled: true, runs: 900 }
    }
  },
  mocha: {
    // timeout: 100000000,
    enableTimeouts: false
  },
  // gasReporter: {
  //   enabled: true
  // },
  etherscan: {
    // apiKey: process.env.ETHER_SCAN
    apiKey: process.env.AURORA_SCAN
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: process.env.MNEMONIC_1
      }
    },
    localGeth: {
      chainId: 1214,
      url: 'http://localhost:8545',
      // accounts: ['0xe836ecb8ed5c68a6e97bd3d7fc86617254fa160b50f5d3a8ce427883c432660d']
      accounts: {
        mnemonic: process.env.MNEMONIC_1
      }
    },
    ropsten: {
      url: process.env.ROPSTEN_ETH,
      accounts: [process.env.TEST_PRIVATE_KEY]
    },
    rinkeby: {
      url: process.env.RINKEBY_ETH,
      accounts: [process.env.TEST_PRIVATE_KEY]
    },
    aurora: {
      url: process.env.INFURA_AURORA,
      // url: 'https://mainnet.aurora.dev',
      accounts: [process.env.TEST_PRIVATE_KEY],
      chainId: 1313161554,
      gas: 10000000
    },
    testnet_aurora: {
      // url: 'https://testnet.aurora.dev',
      url: process.env.INFURA_AURORA_TESTNET,
      accounts: [process.env.TEST_PRIVATE_KEY],
      // accounts: ['0x6f016e74365bbda42f5b8764e6cf1616a734f386c7732414c573f97b8b8ec1d2'],
      // chainId: 1313161555,
      // gasPrice: 120 * 1000000000
      // chainId: 1313161555,
      // accounts: {
      //   mnemonic: process.env.MNEMONIC_1
      // },
      network_id: 0x4e454153, // Aurora testnet ID
      gas: 10000000
    }
  }
};
