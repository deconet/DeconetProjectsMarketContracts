var DecoProxy = artifacts.require('./DecoProxy.sol')
var DecoProxyFactory = artifacts.require('./DecoProxyFactory.sol')
var DecoRelay = artifacts.require('./DecoRelay.sol')
var DecoProjects = artifacts.require('./DecoProjects.sol')
var DecoMilestones = artifacts.require('./DecoMilestones.sol')
var DecoEscrowFactory = artifacts.require('./DecoEscrowFactory.sol')
var DecoArbitration = artifacts.require('./DecoArbitration.sol')

module.exports = async function (deployer) {
  let decoRelay, decoProxyFactory, decoProxy, decoEscrowFactory, decoProjects, decoMilestones, decoArbitration

  let prevDecoRelay = await DecoRelay.deployed()
  let feesWithdrawalAddress = await prevDecoRelay.feesWithdrawalAddress()
  let shareFee = await prevDecoRelay.shareFee()

  console.log('Deploying DecoProxy master contract.')
  await deployer.deploy(DecoProxy)
  decoProxy = await DecoProxy.at(DecoProxy.address)
  deployer.link(DecoProxy, DecoProxyFactory)

  console.log('Deploying DecoProxyFactory contract.')
  await deployer.deploy(DecoProxyFactory, decoProxy.address)

  console.log('Deploying new DecoRelay contract.')
  await deployer.deploy(DecoRelay)
  decoRelay = await DecoRelay.at(DecoRelay.address)

  console.log('Setting DecoEscrowFactory contract address on DecoRelay to ' + DecoEscrowFactory.address)
  await decoRelay.setEscrowFactoryContractAddress(DecoEscrowFactory.address)

  console.log('Setting DecoProjects contract address on DecoRelay to ' + DecoProjects.address)
  await decoRelay.setProjectsContractAddress(DecoProjects.address)

  console.log('Setting DecoMilestones contract address on DecoRelay to ' + DecoMilestones.address)
  await decoRelay.setMilestonesContractAddress(DecoMilestones.address)

  console.log('Setting DecoArbitration contract address on DecoRelay to ' + DecoArbitration.address)
  await decoRelay.setArbitrationContractAddress(DecoArbitration.address)

  console.log('Setting DecoProxyFactory contract address on DecoRelay to ' + DecoProxyFactory.address)
  await decoRelay.setProxyFactoryContractAddress(DecoProxyFactory.address)

  console.log('Setting DecoRelay contract address on DecoProjects to ' + decoRelay.address)
  decoProjects = await DecoProjects.deployed()
  await decoProjects.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoMilestones to ' + decoRelay.address)
  decoMilestones = await DecoMilestones.deployed()
  await decoMilestones.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoArbitration to ' + decoRelay.address)
  decoArbitration = await DecoArbitration.deployed()
  await decoArbitration.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoEscrowFactory to ' + decoRelay.address)
  decoEscrowFactory = await DecoEscrowFactory.deployed()
  await decoEscrowFactory.setRelayContractAddress(decoRelay.address)

  /// Setting fees and withdrawal address.

  console.log('Setting Deconet fee on new DecoRelay to the prev value ' + shareFee)
  await decoRelay.setShareFee(shareFee)

  console.log('Setting Deconet fee withdrawal address on DecoRelay to the prev value ' + feesWithdrawalAddress)
  await decoRelay.setFeesWithdrawalAddress(feesWithdrawalAddress)
}
