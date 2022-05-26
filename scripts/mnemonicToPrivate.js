const ethers = require('ethers');
let mnemonic = "noble inside rescue inform plug venture begin merry equal future lyrics mixture";
// let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/0`);
// console.log(mnemonicWallet.privateKey);

const accountsLength = 5;
for (let i = 0; i < accountsLength; i++) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);
  console.log(`Wallet ${i}:`, wallet.privateKey);
}
