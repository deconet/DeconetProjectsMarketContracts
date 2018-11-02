var HDWalletProvider = require('truffle-hdwallet-provider')
// matching address is 0x648d692e5c507c233d0f9d9fea062429003b3144
let mnemonic = process.env.DECONET_BLOCKCHAIN_ROPSTEN_MNEMONIC
module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      gas: 7900000,
      network_id: '*' // Match any network id
    },
    ropsten: {
      provider: function () {
        // return new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/JTdaA5dJvlwfCfdgT5Cm')
        // local GETH which supports debug
        // return new HDWalletProvider(mnemonic, 'http://127.0.0.1:8549')
        // remote GETH
        return new HDWalletProvider(mnemonic, process.env.DECONET_ROPSTEN_NODE_URL)
      },
      network_id: 3,
      gas: 7900000
    },
    rinkby: {
      provider: function () {
        return new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/JTdaA5dJvlwfCfdgT5Cm')
      },
      network_id: 4,
      gas: 7900000
    },
    coverage: {
      host: "127.0.0.1",
      network_id: "*",
      port: 8997,
      gas: 0xfffffffffff,
      gasPrice: 0x1
    },
    solc: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  }
}
