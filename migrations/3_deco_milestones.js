var DecoMilestones = artifacts.require('./DecoMilestones.sol')

module.exports = function (deployer) {
  let decoMilestones
  console.log('Deploying DecoMilestones contract.')
  deployer
    .deploy(DecoMilestones)
    .then(() => {
      decoMilestones = DecoMilestones.at(DecoMilestones.address)
      console.log('Deployed DecoMilestones contract.')
  })
}
