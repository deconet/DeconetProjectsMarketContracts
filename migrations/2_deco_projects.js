var DecoProjects = artifacts.require('./DecoProjects.sol')

module.exports = function (deployer) {
  let decoProjects
  console.log('Deploying DecoProjects contract.')
  deployer
    .deploy(DecoProjects)
    .then(() => {
      decoProjects = DecoProjects.at(DecoProjects.address)
      console.log('Deployed DecoProjects contract.')
  })
}
