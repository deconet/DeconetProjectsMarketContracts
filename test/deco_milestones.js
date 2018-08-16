var BigNumber = require("bignumber.js")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoProjectsMock = artifacts.require("./DecoProjectsMock.sol")

const DeployProjectsMockContract = async (ownerAddress) => {
  return DecoProjectsMock.new({ from: ownerAddress, gasPrice: 1 })
}

class Milestone {
  constructor(contractStructArray) {
    this.milestoneNumber = contractStructArray[0]
    this.duration = contractStructArray[1]
    this.adjustedDuration = contractStructArray[2]
    this.depositAmount = contractStructArray[3]
    this.startTime = contractStructArray[4]
    this.deliveryTime = contractStructArray[5]
    this.isAccepted = contractStructArray[6]
  }

  assertWithMilestoneParams(
    milestoneNumber,
    duration,
    adjustedDuration,
    depositAmount,
    startTime,
    deliveryTime,
    isAccepted
  ) {
    expect(this.milestoneNumber.eq(milestoneNumber)).to.be.true
    expect(this.duration.eq(duration)).to.be.true
    expect(this.adjustedDuration.eq(adjustedDuration)).to.be.true
    expect(this.depositAmount.eq(depositAmount)).to.be.true
    expect(this.startTime.eq(startTime)).to.be.true
    expect(this.deliveryTime.eq(deliveryTime)).to.be.true
    expect(this.isAccepted).to.be.equal(isAccepted)
  }

  static createValidMilestoneInstance(milestoneNumber) {
    let duration = new BigNumber((Math.floor(Math.random() * 24) + 1) * 60 * 60)
    let etherValue = Math.floor(Math.random() * 5) + 1
    let weiValue = web3.toWei(etherValue, "ether")
    let priceInEther = new BigNumber(weiValue)
    return new Milestone(
      [
        new BigNumber(milestoneNumber),
        duration,
        duration,
        priceInEther,
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(0),
        false
      ]
    )
  }
}

contract("DecoMilestones", async (accounts) => {
  let decoMilestones = undefined
  let projectId = 0
  let testAgreementHash = ""
  let mock = undefined
  let client = undefined

  beforeEach(async () => {
    decoMilestones = await DecoMilestones.deployed()
    testAgreementHash = web3.sha3(`QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtWN${projectId++}`)
    mock = Milestone.createValidMilestoneInstance(1)
    client = accounts[0]
  })

  it("should start a new milestone for the existing project.", async () => {
    let projectsContractMock = await DeployProjectsMockContract(client)
    await decoMilestones.setProjectContractAddress(
      projectsContractMock.address,
      { from: client, gasPrice: 1}
    )
    await projectsContractMock.setIsProjectExistingConfig(true)
    await projectsContractMock.setProjectMilestonesCountConfig(10)

    let txn = await decoMilestones.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.duration.toNumber(),
      { from: client, gasPrice: 1, value: mock.depositAmount.toNumber() }
    )
    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    mock.startTime = new BigNumber(blockInfo.timestamp)

    let milestoneArray = await decoMilestones.projectMilestones.call(testAgreementHash, 0)
    expect(milestoneArray[0].toNumber()).to.not.be.equal(0)
    let milestone = new Milestone(milestoneArray)
    milestone.assertWithMilestoneParams(
      mock.milestoneNumber,
      mock.duration,
      mock.adjustedDuration,
      mock.depositAmount,
      mock.startTime,
      mock.deliveryTime,
      mock.isAccepted
    )
  })

  it(
    "should fail starting a new milestone for the existing project if sent ether value is less then needed.",
    async () => {
      let projectsContractMock = await DeployProjectsMockContract(accounts[0])
      await decoMilestones.setProjectContractAddress(
        projectsContractMock.address,
        { from: client, gasPrice: 1 }
      )
      await projectsContractMock.setIsProjectExistingConfig(true)
      await projectsContractMock.setProjectMilestonesCountConfig(10)

      await decoMilestones.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.duration.toNumber(),
        { from: client, gasPrice: 1, value: mock.depositAmount.minus(new BigNumber(100)).toString() }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        let milestoneArray = await decoMilestones.getMilestone(testAgreementHash, 0)
        expect(milestoneArray[0].toNumber()).to.be.equal(0)
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })
})
