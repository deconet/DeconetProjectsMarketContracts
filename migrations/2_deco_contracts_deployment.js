var DecoEscrow = artifacts.require('./DecoEscrow.sol')
var DecoEscrowFactory = artifacts.require('./DecoEscrowFactory.sol')
var DecoProjects = artifacts.require('./DecoProjects.sol')
var DecoMilestones = artifacts.require('./DecoMilestones.sol')
var DecoRelay = artifacts.require('./DecoRelay.sol')
var DecoArbitration = artifacts.require('./DecoArbitration.sol')

module.exports = function (deployer) {
  let decoRelay, decoEscrowFactory, decoEscrow, decoProjects, decoMilestones, decoArbitration

  console.log('Deploying DecoRelay contract.')
  deployer.deploy(DecoRelay).then(() => {
    decoRelay = DecoRelay.at(DecoRelay.address)
    deployer.link(DecoRelay, [DecoProjects, DecoMilestones])
    console.log('Deploying DecoEscrow contract.')
    return deployer.deploy(DecoEscrow)
  }).then(() => {
    decoEscrow = DecoEscrow.at(DecoEscrow.address)
    deployer.link(DecoEscrow, [DecoEscrowFactory, DecoMilestones])
    console.log('Deploying DecoEscrowFactory contract.')
    return deployer.deploy(DecoEscrowFactory, decoEscrow.address)
  }).then(() => {
    decoEscrowFactory = DecoEscrowFactory.at(DecoEscrowFactory.address)
    deployer.link(DecoEscrowFactory, DecoProjects)
    console.log('Deploying DecoProjects contract.')
    return deployer.deploy(DecoProjects)
  }).then(() => {
    decoProjects = DecoProjects.at(DecoProjects.address)
    deployer.link(DecoProjects, DecoMilestones)
    console.log('Deploying DecoMilestones contract.')
    return deployer.deploy(DecoMilestones)
  }).then(() => {
    decoMilestones = DecoMilestones.at(DecoMilestones.address)
    deployer.link(DecoMilestones, DecoArbitration)
    console.log('Deploying DecoArbitration contract.')
    return deployer.deploy(DecoArbitration)
  }).then(() => {
    decoArbitration = DecoArbitration.at(DecoArbitration.address)
    console.log('Setting DecoEscrowFactory contract address on DecoRelay to ' + decoEscrowFactory.address)
    return decoRelay.setEscrowFactoryContractAddress(decoEscrowFactory.address)
  }).then(() => {
    console.log('Setting DecoProjects contract address on DecoRelay to ' + decoProjects.address)
    return decoRelay.setProjectsContractAddress(decoProjects.address)
  }).then(() => {
    console.log('Setting DecoMilestones contract address on DecoRelay to ' + decoMilestones.address)
    return decoRelay.setMilestonesContractAddress(decoMilestones.address)
  }).then(() => {
    console.log('Setting DecoArbitration contract address on DecoRelay to ' + decoArbitration.address)
    return decoRelay.setArbitrationContractAddress(decoArbitration.address)
  }).then(() => {
    console.log('Setting DecoRelay contract address on DecoProjects to ' + decoRelay.address)
    return decoProjects.setRelayContractAddress(decoRelay.address)
  }).then(() => {
    console.log('Setting DecoRelay contract address on DecoMilestones to ' + decoRelay.address)
    return decoMilestones.setRelayContractAddress(decoRelay.address)
  }).then(() => {
    console.log('Setting DecoRelay contract address on DecoArbitration to ' + decoRelay.address)
    return decoArbitration.setRelayContractAddress(decoRelay.address)
  })
}
