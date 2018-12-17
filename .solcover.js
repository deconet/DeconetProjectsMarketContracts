module.exports = {
  accounts: 20,
  port: 8997,
  testrpcOptions: '--accounts 20 -e 1000 --port 8997 -i 99 --noVMErrorsOnRPCResponse true',
  // norpc: true,
  copyPackages: ['openzeppelin-solidity', '@optionality.io/clone-factory'],
  compileCommand: '../node_modules/.bin/truffle compile',
  testCommand: '../node_modules/.bin/truffle test --network coverage',
  skipFiles: [
    'Migrations.sol',
    'mocks/'
  ]
};
