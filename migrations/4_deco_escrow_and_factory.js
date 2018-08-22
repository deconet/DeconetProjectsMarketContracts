var DecoEscrow = artifacts.require('./DecoEscrow.sol')
var DecoEscrowFactory = artifacts.require('./DecoEscrowFactory.sol')

module.exports = function (deployer) {
  let decoEscrow, decoEscrowFactory
  console.log("Deploying DecoEscrow contract.")
  deployer.deploy(DecoEscrow).then(() => {
    decoEscrow = DecoEscrow.at(DecoEscrow.address)
    console.log("Deployed DecoEscrow contract.")
    deployer.link(DecoEscrow, DecoEscrowFactory)
    console.log("Deploying DecoEscrowFactory contract.")
    return deployer.deploy(DecoEscrowFactory, decoEscrow.address)
  }).then(() => {
    console.log("Deployed DecoEscrowFactory contract.")
  })
}
