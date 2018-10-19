var BigNumber = require("bignumber.js")
var DecoTestToken = artifacts.require("./DecoTestToken.sol")
var DecoMilestonesMock = artifacts.require("./DecoMilestonesMock.sol")
var DecoProjectsStub = artifacts.require("./DecoProjectsStub.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoEscrowStub = artifacts.require("./DecoEscrowStub.sol")

class Milestone {
  constructor(contractStructArray) {
    this.milestoneNumber = contractStructArray[0]
    this.duration = contractStructArray[1]
    this.adjustedDuration = contractStructArray[2]
    this.depositAmount = contractStructArray[3]
    this.tokenAddress = contractStructArray[4]
    this.startTime = contractStructArray[5]
    this.deliveryTime = contractStructArray[6]
    this.isAccepted = contractStructArray[7]
  }

  assertWithMilestoneParams(
    milestoneNumber,
    duration,
    adjustedDuration,
    depositAmount,
    tokenAddress,
    startTime,
    deliveryTime,
    isAccepted
  ) {
    expect(this.milestoneNumber.eq(milestoneNumber)).to.be.true
    expect(this.duration.eq(duration)).to.be.true
    expect(this.adjustedDuration.eq(adjustedDuration)).to.be.true
    expect(this.depositAmount.eq(depositAmount)).to.be.true
    expect((new BigNumber(this.tokenAddress)).toNumber()).to.be.equal(
      (new BigNumber(this.tokenAddress)).toNumber()
    )
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
        new BigNumber(0),
        priceInEther,
        "0x0",
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(0),
        false
      ]
    )
  }
}

contract("DecoMilestones", async (accounts) => {
  let decoEscrowStub = undefined
  let decoTestToken = undefined
  let decoMilestonesMock = undefined
  let decoRelay = undefined
  let decoProjectsStub = undefined
  let projectId = 0
  let testAgreementHash = ""
  let mock = undefined
  let client = undefined

  const DeployProjectsStubContract = async (ownerAddress) => {
    decoProjectsStub = await DecoProjectsStub.new({ from: ownerAddress, gasPrice: 1 })
    if(decoRelay) {
      await decoRelay.setProjectsContractAddress(decoProjectsStub.address, {from: accounts[0], gasPrice: 1})
      await decoProjectsStub.setRelayContractAddress(decoRelay.address, {from: ownerAddress, gasPrice: 1})
    }
    return decoProjectsStub
  }

  const DeployEscrowStubContract = async (ownerAddress) => {
    decoEscrowStub = await DecoEscrowStub.new({from: ownerAddress, gasPrice: 1})
    if(decoProjectsStub.address != undefined) {
      await decoProjectsStub.setEscrowContractStubAddress(decoEscrowStub.address)
    }
    if (decoMilestonesMock.address != undefined) {
      console.log("milestones mock set as escrow authorized address.")
      await decoEscrowStub.initialize(ownerAddress, decoMilestonesMock.address, {from: ownerAddress, gasPrice: 1})
    }
  }

  const BumpProjectId = () => {
    testAgreementHash = web3.sha3(`QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtWN${projectId++}`)
  }

  before(async () => {
    decoMilestonesMock = await DecoMilestonesMock.new({from: accounts[0], gasPrice: 1})
    decoRelay = await DecoRelay.deployed()
    await decoRelay.setMilestonesContractAddress(decoMilestonesMock.address, {from: accounts[0], gasPrice: 1})
    decoMilestonesMock.setRelayContractAddress(decoRelay.address, {from: accounts[0], gasPrice: 1})
    await DeployProjectsStubContract(accounts[0])
    decoTestToken = await DecoTestToken.new({from: accounts[0], gasPrice: 1})
    await DeployEscrowStubContract(accounts[0])
    let amount = web3.toWei(1000000)
    await decoTestToken.approve(decoEscrowStub.address, amount.toString(), {from: accounts[0], gasPrice: 1})
  })

  beforeEach(async () => {
    BumpProjectId()
    mock = Milestone.createValidMilestoneInstance(1)
    client = accounts[0]
  })

  it("should start a new milestone for the existing project.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)
    await decoProjectsStub.setProjectClient(client)

    await decoEscrowStub.sendTransaction({from: accounts[7], value: web3.toWei(9), gasPrice: 1})

    let startAndCheck = async (amount, tokenAddress) => {
      mock.depositAmount = new BigNumber(web3.toWei(amount))
      mock.tokenAddress = tokenAddress
      let txn = await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      mock.startTime = new BigNumber(blockInfo.timestamp)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.updatedBy).to.be.equal(client)
      expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.state.toNumber()).to.be.equal(0)

      let milestoneArray = await decoMilestonesMock.projectMilestones.call(
        testAgreementHash,
        mock.milestoneNumber.minus(1).toNumber()
      )
      expect(milestoneArray[0].toNumber()).to.not.be.equal(0)
      let milestone = new Milestone(milestoneArray)
      milestone.assertWithMilestoneParams(
        mock.milestoneNumber,
        mock.duration,
        mock.adjustedDuration,
        mock.depositAmount,
        mock.tokenAddress,
        new BigNumber(blockInfo.timestamp),
        new BigNumber(0),
        mock.isAccepted
      )

      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    }

    await startAndCheck(1, "0x0")
    await startAndCheck(3.33, "0x0")
    await startAndCheck(0.1, "0x0")
    await startAndCheck(0.7566, "0x0")
    await startAndCheck(3.7566, "0x0")
    await decoEscrowStub.depositErc20(decoTestToken.address, web3.toWei(1800), {from: accounts[0], gasPrice: 1})
    await startAndCheck(366, decoTestToken.address)
    await startAndCheck(6, decoTestToken.address)
    await startAndCheck(1, decoTestToken.address)
    await startAndCheck(1366, decoTestToken.address)
    await startAndCheck(9, decoTestToken.address)
  })

  it(
    "should fail starting a new milestone for the existing project if there is no funds in Escrow.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(10)
      await decoProjectsStub.setProjectClient(client)

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(0)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance.plus(1000000000000000)
      mock.tokenAddress = "0x0"
      await startAndCheck()
      mock.depositAmount = escrowEthBalance.plus(1)
      mock.tokenAddress = "0x0"
      await startAndCheck()
      mock.depositAmount = tokenBalance.plus(1)
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
      mock.depositAmount = tokenBalance.plus(100000000000)
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone for not existing project.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(false)
      await decoProjectsStub.setProjectMilestonesCountConfig(10)
      await decoProjectsStub.setProjectClient(client)

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(0)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = "0x0"
      await startAndCheck()
      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = "0x0"
      await startAndCheck()
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone by not project's client.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(10)
      await decoProjectsStub.setProjectClient(accounts[7])

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async (sender) => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: sender, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(0)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = "0x0"
      await startAndCheck(accounts[11])
      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = "0x0"
      await startAndCheck(accounts[12])
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck(accounts[13])
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck(accounts[14])
  })

  it(
    "should fail starting a new milestone when there is one active.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(10)
      await decoProjectsStub.setProjectClient(client)

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(1)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = "0x0"
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await startAndCheck()

      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)

      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone when the very last one has been already completed.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(1)
      await decoProjectsStub.setProjectClient(client)

      await decoEscrowStub.sendTransaction({from: accounts[8], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(1)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance.div(3)
      mock.tokenAddress = "0x0"
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()

      BumpProjectId()

      mock.depositAmount = tokenBalance.div(3)
      mock.tokenAddress = decoTestToken.address
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone when the very last one has been already completed.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(1)
      await decoProjectsStub.setProjectClient(client)

      await decoEscrowStub.sendTransaction({from: accounts[8], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toNumber(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          expect(milestoneArray[0].toNumber()).to.be.equal(1)
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance.div(3)
      mock.tokenAddress = "0x0"
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()

      BumpProjectId()

      mock.depositAmount = tokenBalance.div(3)
      mock.tokenAddress = decoTestToken.address
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()
  })
})
