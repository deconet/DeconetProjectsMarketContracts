var DecoEscrow = artifacts.require('./DecoEscrow.sol')
var DecoEscrowFactory = artifacts.require('./DecoEscrowFactory.sol')
var DecoProjects = artifacts.require('./DecoProjects.sol')
var DecoMilestones = artifacts.require('./DecoMilestones.sol')
var DecoRelay = artifacts.require('./DecoRelay.sol')
var DecoArbitration = artifacts.require('./DecoArbitration.sol')
var DecoProxy = artifacts.require('./DecoProxy.sol')
var DecoProxyFactory = artifacts.require('./DecoProxyFactory.sol')

module.exports = async function (deployer, network, accounts) {
  let decoRelay, decoEscrowFactory, decoEscrow, decoProjects, decoMilestones, decoArbitration, decoProxy, decoProxyFactory

  let chainId = ''
  console.log('Network is '+network)
  if (network == 'development' || network == 'coverage') {
    chainId = 95
  } else if (network == 'ropsten' || network == 'ropsten-fork') {
    chainId = 3
  } else if (network == 'kovan' || network == 'kovan-fork') {
    chainId = 42
  } else if (network == 'mainnet' || network == 'mainnet-fork') {
    chainId = 1
  }

  console.log('Deploying DecoRelay contract.')
  await deployer.deploy(DecoRelay)
  decoRelay = await DecoRelay.at(DecoRelay.address)
  deployer.link(DecoRelay, [DecoProjects, DecoMilestones])

  console.log('Deploying DecoEscrow contract.')
  await deployer.deploy(DecoEscrow)
  decoEscrow = await DecoEscrow.at(DecoEscrow.address)
  deployer.link(DecoEscrow, [DecoEscrowFactory, DecoMilestones])

  console.log('Deploying DecoEscrowFactory contract.')
  await deployer.deploy(DecoEscrowFactory, decoEscrow.address)
  decoEscrowFactory = await DecoEscrowFactory.at(DecoEscrowFactory.address)
  deployer.link(DecoEscrowFactory, DecoProjects)

  console.log('Deploying DecoProjects contract with chainId ' + chainId)
  await deployer.deploy(DecoProjects, chainId)
  decoProjects = await DecoProjects.at(DecoProjects.address)
  deployer.link(DecoProjects, DecoMilestones)

  console.log('Deploying DecoMilestones contract.')
  await deployer.deploy(DecoMilestones)
  decoMilestones = await DecoMilestones.at(DecoMilestones.address)
  deployer.link(DecoMilestones, DecoArbitration)

  console.log('Deploying DecoArbitration contract.')
  await deployer.deploy(DecoArbitration)
  decoArbitration = await DecoArbitration.at(DecoArbitration.address)

  console.log('Deploying DecoProxy contract.')
  await deployer.deploy(DecoProxy)
  decoProxy = await DecoProxy.at(DecoProxy.address)

  console.log('Deploying DecoProxyFactory contract.')
  await deployer.deploy(DecoProxyFactory, decoProxy.address)
  decoProxyFactory = await DecoProxyFactory.at(DecoProxyFactory.address)

  console.log('Setting DecoEscrowFactory contract address on DecoRelay to ' + decoEscrowFactory.address)
  await decoRelay.setEscrowFactoryContractAddress(decoEscrowFactory.address)

  console.log('Setting DecoProjects contract address on DecoRelay to ' + decoProjects.address)
  await decoRelay.setProjectsContractAddress(decoProjects.address)

  console.log('Setting DecoMilestones contract address on DecoRelay to ' + decoMilestones.address)
  await decoRelay.setMilestonesContractAddress(decoMilestones.address)

  console.log('Setting DecoArbitration contract address on DecoRelay to ' + decoArbitration.address)
  await decoRelay.setArbitrationContractAddress(decoArbitration.address)

  console.log('Setting DecoProxyFactory contract address on DecoRelay to ' + decoProxyFactory.address)
  await decoRelay.setProxyFactoryContractAddress(decoProxyFactory.address)

  console.log('Setting DecoRelay contract address on DecoProjects to ' + decoRelay.address)
  await decoProjects.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoMilestones to ' + decoRelay.address)
  await decoMilestones.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoArbitration to ' + decoRelay.address)
  await decoArbitration.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoEscrowFactory to ' + decoRelay.address)
  await decoEscrowFactory.setRelayContractAddress(decoRelay.address)

  console.log('Setting DecoRelay contract address on DecoProxyFactory to ' + decoRelay.address)
  await decoProxyFactory.setRelayContractAddress(decoRelay.address)

  /// Setting fees and withdrawal address.

  let fee = '0'
  console.log(`Setting Deconet fee on DecoRelay to ${fee}`)
  await decoRelay.setShareFee(`${fee}`)

  let withdrawalAddress = accounts[0]
  console.log('Setting Deconet fee withdrawal address on DecoRelay to ' + withdrawalAddress)
  await decoRelay.setFeesWithdrawalAddress(withdrawalAddress)

  console.log('Setting Deconet fee withdrawal address as withdrawal address in Deco Arbitration contract.')
  await decoArbitration.setWithdrawalAddress(withdrawalAddress)

  let disputeDaysLimitToReply = 7 * 24 * 60 // 7 days to review proposal and either accept or reject it.
  console.log('Setting Deconet Arbitration contract limit for respondent to reply on dispute proposal.')
  await decoArbitration.setTimeLimitForReplyOnProposal(`${disputeDaysLimitToReply}`)

  let arbitrationShareFee = '0' // %
  let arbitrationFixedFee = '0' // 0 ETH
  console.log(`Setting Deconet Arbitration contract share fee to ${arbitrationShareFee}, and fixed fee to ${arbitrationFixedFee}.`)
  await decoArbitration.setFees(arbitrationFixedFee, arbitrationShareFee)
}
