const increaseTime = require("./helpers/time").increaseTime
var BigNumber = require("bignumber.js")
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })
var DecoTestToken = artifacts.require("./DecoTestToken.sol")
var DecoMilestonesMock = artifacts.require("./DecoMilestonesMock.sol")
var DecoProjectsStub = artifacts.require("./DecoProjectsStub.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoEscrowStub = artifacts.require("./DecoEscrowStub.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

class Milestone {
  constructor(contractStructArray) {
    this.milestoneNumber = new BigNumber(contractStructArray[0])
    this.duration = new BigNumber(contractStructArray[1])
    this.adjustedDuration = new BigNumber(contractStructArray[2])
    this.depositAmount = new BigNumber(contractStructArray[3])
    this.tokenAddress = contractStructArray[4]
    this.startedTime = new BigNumber(contractStructArray[5])
    this.deliveredTime = new BigNumber(contractStructArray[6])
    this.acceptedTime = new BigNumber(contractStructArray[7])
    this.isOnHold = contractStructArray[8]
  }

  assertWithMilestoneParams(
    milestoneNumber,
    duration,
    adjustedDuration,
    depositAmount,
    tokenAddress,
    startedTime,
    deliveredTime,
    acceptedTime,
    isOnHold
  ) {
    expect(this.milestoneNumber.eq(milestoneNumber)).to.be.true
    expect(this.duration.eq(duration)).to.be.true
    expect(this.adjustedDuration.eq(adjustedDuration)).to.be.true
    expect(this.depositAmount.eq(depositAmount)).to.be.true
    expect(this.tokenAddress).to.be.equal(tokenAddress)
    expect(this.startedTime.eq(startedTime)).to.be.true
    expect(this.deliveredTime.eq(deliveredTime)).to.be.true
    expect(this.acceptedTime.eq(acceptedTime)).to.be.true
    expect(this.isOnHold).to.be.equal(isOnHold)
  }

  static createValidMilestoneInstance(milestoneNumber) {
    let duration = new BigNumber((Math.floor(Math.random() * 24) + 1) * 60 * 60)
    let etherValue = Math.floor(Math.random() * 5) + 1
    let weiValue = web3.utils.toWei(etherValue.toString(), "ether")
    let priceInEther = new BigNumber(weiValue)
    return new Milestone(
      [
        new BigNumber(milestoneNumber),
        duration,
        duration,
        priceInEther,
        ZERO_ADDRESS,
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(0),
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
  let maker = undefined
  let arbiter = undefined
  let maxNumberOfMilestones = 4
  let feedbackWindow = 1
  let milestoneStartWindow = 1
  let deconetShareFee = 12

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
    if (decoMilestonesMock.address != undefined && decoRelay.address != undefined) {
      await decoEscrowStub.initialize(
        ownerAddress,
        decoMilestonesMock.address,
        deconetShareFee,
        decoRelay.address,
        {from: ownerAddress, gasPrice: 1}
      )
    }
  }

  const BumpProjectId = () => {
    testAgreementHash = web3.utils.soliditySha3(`QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtWN${projectId++}`)
  }

  const IncreaseTime = async (time) => {
    if (time == undefined) {
      await increaseTime(500)
    } else {
      await increaseTime(time)
    }
  }

  before(async () => {
    decoMilestonesMock = await DecoMilestonesMock.new({from: accounts[0], gasPrice: 1})
    decoRelay = await DecoRelay.deployed()
    await decoRelay.setMilestonesContractAddress(decoMilestonesMock.address, {from: accounts[0], gasPrice: 1})
    decoMilestonesMock.setRelayContractAddress(decoRelay.address, {from: accounts[0], gasPrice: 1})
    await DeployProjectsStubContract(accounts[0])
    decoTestToken = await DecoTestToken.new({from: accounts[0], gasPrice: 1})
    await DeployEscrowStubContract(accounts[0])
    let amount = web3.utils.toWei("1000000")
    await decoTestToken.approve(decoEscrowStub.address, amount.toString(), {from: accounts[0], gasPrice: 1})
  })

  beforeEach(async () => {
    BumpProjectId()
    mock = Milestone.createValidMilestoneInstance(1)
    client = accounts[0]
    await decoProjectsStub.setProjectClient(client)
    maker = accounts[1]
    await decoProjectsStub.setProjectMaker(maker)
    arbiter = accounts[2]
    await decoProjectsStub.setProjectArbiter(arbiter)

    maxNumberOfMilestones = 4
    feedbackWindow = 1
    milestoneStartWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(false)
    await decoProjectsStub.setProjectFeedbackWindow(feedbackWindow)
    await decoProjectsStub.setProjectMilestoneStartWindow(milestoneStartWindow)

    let lastBlock = await web3.eth.getBlock(web3.eth.defaultBlock)
    await decoProjectsStub.setProjectStartDateConfig(lastBlock.timestamp)
  })

  it("should start a new milestone for the existing project.", async () => {
    maxNumberOfMilestones = 12
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)

    await decoEscrowStub.sendTransaction({from: accounts[7], value: web3.utils.toWei("9"), gasPrice: 1})

    let startAndCheck = async (amount, tokenAddress) => {
      mock.depositAmount = new BigNumber(web3.utils.toWei(amount.toString()))
      mock.tokenAddress = tokenAddress
      let txn = await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      mock.startedTime = new BigNumber(blockInfo.timestamp)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(client)
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
        mock.acceptedTime,
        mock.isOnHold
      )

      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    }

    await startAndCheck(0, ZERO_ADDRESS)
    await startAndCheck(1, ZERO_ADDRESS)
    await startAndCheck(3.33, ZERO_ADDRESS)
    await startAndCheck(0.1, ZERO_ADDRESS)
    await startAndCheck(0.7566, ZERO_ADDRESS)
    await startAndCheck(3.7566, ZERO_ADDRESS)
    await decoEscrowStub.depositErc20(decoTestToken.address, web3.utils.toWei("1800"), {from: accounts[0], gasPrice: 1})
    await startAndCheck(0, decoTestToken.address)
    await startAndCheck(366, decoTestToken.address)
    await startAndCheck(6, decoTestToken.address)
    await startAndCheck(1, decoTestToken.address)
    await startAndCheck(1366, decoTestToken.address)
    await startAndCheck(9, decoTestToken.address)
  })

  it(
    "should fail starting a new milestone for the existing project if there is no funds in Escrow.",
    async () => {
      maxNumberOfMilestones = 10
      await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)

      let escrowEthBalance = await decoEscrowStub.balance.call()
      escrowEthBalance = new BigNumber(escrowEthBalance)
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
      tokenBalance = new BigNumber(tokenBalance)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal("0")
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance.plus(1000000000000000)
      mock.tokenAddress = ZERO_ADDRESS
      await startAndCheck()
      mock.depositAmount = escrowEthBalance.plus(1)
      mock.tokenAddress = ZERO_ADDRESS
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

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal("0")
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
      await startAndCheck()
      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
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
      await decoProjectsStub.setProjectClient(accounts[7])

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async (sender) => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: sender, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal("0")
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
      await startAndCheck(accounts[11])
      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
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

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        let beforeCount = await decoMilestonesMock.countOfMilestones(testAgreementHash)
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal(beforeCount.toString())
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
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
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone when the very last one has been already completed.",
    async () => {
      maxNumberOfMilestones = 1
      await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)

      await decoEscrowStub.sendTransaction({from: accounts[8], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      escrowEthBalance = new BigNumber(escrowEthBalance)
      await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
      tokenBalance = new BigNumber(tokenBalance)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal("1")
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance.div(3).integerValue()
      mock.tokenAddress = ZERO_ADDRESS
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()

      BumpProjectId()

      mock.depositAmount = tokenBalance.div(3).integerValue()
      mock.tokenAddress = decoTestToken.address
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await startAndCheck()
  })

  it(
    "should fail starting a new milestone for ended project.",
    async () => {
      let lastBlock = await web3.eth.getBlock(web3.eth.defaultBlock)
      await decoProjectsStub.setProjectEndDateConfig(lastBlock.timestamp - 60)

      let escrowEthBalance = await decoEscrowStub.balance.call()
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let startAndCheck = async () => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
          expect(count.toString()).to.be.equal("0")
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
      await startAndCheck()
      mock.depositAmount = escrowEthBalance
      mock.tokenAddress = ZERO_ADDRESS
      await startAndCheck()
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
      mock.depositAmount = tokenBalance
      mock.tokenAddress = decoTestToken.address
      await startAndCheck()
  })

  it("should manage to make a delivery by maker.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[8], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = new BigNumber(escrowEthBalance).div(10).integerValue()
    mock.tokenAddress = ZERO_ADDRESS

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      let txn = await decoMilestonesMock.deliverLastMilestone(testAgreementHash, {from: maker, gasPrice: 1})
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, milestoneId)
      let milestone = new Milestone(milestoneArray)
      expect(milestone.deliveredTime.toString()).to.be.equal(blockInfo.timestamp.toString())
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(maker)
      expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
      expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
      expect(emittedEvent.args.state.toString()).to.be.equal("1")

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await deliverAndCheckState()
    }
  })

  it("should fail delivering milestone that is not active.", async () => {
    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    mock.depositAmount = new BigNumber(tokenBalance).div(10).integerValue()
    mock.tokenAddress = decoTestToken.address

    await decoProjectsStub.setIsProjectExistingConfig(false)
    let milestoneId = 0
    let deliverAndCheckState = async () => {
      if (milestoneId > 0) {
        await decoProjectsStub.setIsProjectExistingConfig(true)
      }
      if (milestoneId > 1) {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        )
        if(milestoneId % 2 == 1) {
          await decoMilestonesMock.markMilestoneAsDelivered(testAgreementHash)
        } else {
          await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
        }
      }
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      if(milestoneId > 1) {
        mock.milestoneNumber = mock.milestoneNumber.plus(1)
        await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      }
      milestoneId += 1
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await deliverAndCheckState()
    }
  })

  it("should fail delivering milestone that is frozen/on hold.", async () => {
    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    mock.depositAmount = new BigNumber(tokenBalance).div(10).integerValue()
    mock.tokenAddress = decoTestToken.address

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, milestoneId.toString())
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toString()).to.be.equal("0")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await deliverAndCheckState()
    }
  })

  it("should fail delivering milestone by not a maker.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[4], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = new BigNumber(escrowEthBalance).div(10).integerValue()
    mock.tokenAddress = ZERO_ADDRESS

    let milestoneId = 0
    let deliverAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, milestoneId.toString())
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toString()).to.be.equal("0")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
    }

    await deliverAndCheckState(accounts[10])
    await deliverAndCheckState(accounts[11])
    await deliverAndCheckState(accounts[12])
    await deliverAndCheckState(accounts[13])
  })

  it("should fail delivering milestone of a project that is not active.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = new BigNumber(escrowEthBalance).div(10).integerValue()
    mock.tokenAddress = ZERO_ADDRESS

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )

      await decoProjectsStub.setProjectEndDateConfig(Math.floor(Date.now() / 1000) - 60)
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, milestoneId.toString())
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toString()).to.be.equal("0")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
      await decoProjectsStub.setProjectEndDateConfig(0)
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await deliverAndCheckState()
    }
  })

  it("should accept delivered milestone successfully by client.", async () => {
    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    tokenBalance = new BigNumber(tokenBalance)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let milestoneId = 0
    let acceptAndCheckState = async (shouldBeZeroAmount) => {

      if(milestoneId % 2 == 0) {
        let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
        mock.depositAmount = new BigNumber(amount)
        mock.tokenAddress = decoTestToken.address
      } else {
        let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
        mock.depositAmount = new BigNumber(amount)
        mock.tokenAddress = ZERO_ADDRESS
      }
      if(shouldBeZeroAmount) {
        mock.depositAmount = new BigNumber(0)
      }

      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )

      await IncreaseTime()

      let blockedAmount = undefined
      let makerWithdrawalAllowance = undefined
      if(milestoneId % 2 == 0) {
        blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
        makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          maker,
          mock.tokenAddress
        )
      } else {
        blockedAmount = await decoEscrowStub.blockedBalance.call()
        makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
      }

      let txn = await decoMilestonesMock.acceptLastMilestone(
        testAgreementHash,
        {from: client, gasPrice: 1}
      )
      let fee = Math.floor(mock.depositAmount.times(deconetShareFee).div(100).toNumber())

      let actualBlockedAmount = undefined
      let actualMakerWithdrawalAllowance = undefined
      if(milestoneId % 2 == 0) {
        actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
        actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          maker,
          mock.tokenAddress
        )
      } else {
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
      }

      expect(actualBlockedAmount.toString()).to.be.equal(
        new BigNumber(blockedAmount).minus(mock.depositAmount).toString()
      )
      expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(
        mock.depositAmount.minus(fee).plus(makerWithdrawalAllowance).toString()
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, milestoneId)
      let milestone = new Milestone(milestoneArray)

      expect(milestone.acceptedTime.gt(0)).to.be.true

      let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
      expect(new BigNumber(projectEndDate).eq(blockInfo.timestamp)).to.be.equal(
        mock.milestoneNumber.eq(maxNumberOfMilestones)
      )

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(client)
      expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
      expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
      expect(emittedEvent.args.state.toString()).to.be.equal("2")

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await acceptAndCheckState(i < maxNumberOfMilestones - 2)
    }
  })

  it("should fail accepting milestone by not a client", async () => {
    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    tokenBalance = new BigNumber(tokenBalance)

    let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await IncreaseTime()
    let blockedAmount = undefined
    let makerWithdrawalAllowance = undefined
    blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
    makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
      maker,
      mock.tokenAddress
    )

    let acceptAndCheckState = async (sender) => {
      await decoMilestonesMock.acceptLastMilestone(
        testAgreementHash,
        {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, 0)
        let milestone = new Milestone(milestoneArray)

        expect(milestone.acceptedTime.toString()).to.be.equal("0")

        let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
        let projectCompleted = await decoProjectsStub.projectCompleted.call()
        expect(projectCompleted).to.be.false
        expect(projectEndDate.toString()).to.be.equal("0")

        let actualBlockedAmount = undefined
        let actualMakerWithdrawalAllowance = undefined
        actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
        actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          maker,
          mock.tokenAddress
        )

        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    await acceptAndCheckState(accounts[7])
    await decoProjectsStub.setProjectMilestonesCountConfig(1)
    await acceptAndCheckState(accounts[5])
  })

  it(
    "should fail accepting milestone if it is on hold, or not delivered, or already accepted, or not exist.",
    async () => {
      await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
      tokenBalance = new BigNumber(tokenBalance)

      let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = decoTestToken.address

      let blockedAmount = undefined
      let makerWithdrawalAllowance = undefined
      blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
      makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
        maker,
        mock.tokenAddress
      )

      let acceptAndCheckState = async (sender) => {
        await IncreaseTime()
        let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
        let milestoneArray, milestone, acceptedTime
        if(count.toString() !== "0") {
          milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, 0)
          milestone = new Milestone(milestoneArray)
          acceptedTime = milestone.acceptedTime
        }
        await decoMilestonesMock.acceptLastMilestone(
          testAgreementHash,
          {from: client, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          if(count.toString() === "0") return
          milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, 0)
          milestone = new Milestone(milestoneArray)

          expect(milestone.acceptedTime.toString()).to.be.equal(acceptedTime.toString())

          let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
          let projectCompleted = await decoProjectsStub.projectCompleted.call()
          expect(projectCompleted).to.be.false
          expect(projectEndDate.toString()).to.be.equal("0")

          let actualBlockedAmount = undefined
          let actualMakerWithdrawalAllowance = undefined
          actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
          actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
            maker,
            mock.tokenAddress
          )

          expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
          expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
        }).then(async (txn) => {
          if (txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await acceptAndCheckState()

      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
      makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
        maker,
        mock.tokenAddress
      )

      await acceptAndCheckState()

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )

      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

      await acceptAndCheckState()

      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
      await decoMilestonesMock.acceptLastMilestone(
          testAgreementHash,
          {from: client, gasPrice: 1}
      )
      blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
      makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
        maker,
        mock.tokenAddress
      )
      await acceptAndCheckState()
  })

  it("should fail accepting milestone when project is not active anymore or not started yet.", async () => {
    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    tokenBalance = new BigNumber(tokenBalance)

    let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address

    let acceptAndCheckState = async () => {
      await decoMilestonesMock.acceptLastMilestone(
        testAgreementHash,
        {from: client, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
        if (count.toString() === "0") return
        let milestoneArray = await decoMilestonesMock.projectMilestones.call(testAgreementHash, 0)
        let milestone = new Milestone(milestoneArray)
        expect(milestone.acceptedTime.toNumber()).to.be.equal(0)

        let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
        expect(projectEndDate.toNumber()).to.be.not.equal(0)

        let actualBlockedAmount = undefined
        let actualMakerWithdrawalAllowance = undefined
        actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
        actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          maker,
          mock.tokenAddress
        )

        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await decoProjectsStub.setIsProjectExistingConfig(false)

    await acceptAndCheckState()
    await decoProjectsStub.setIsProjectExistingConfig(true)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await IncreaseTime()
    let blockedAmount = undefined
    let makerWithdrawalAllowance = undefined
    blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
    makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
      maker,
      mock.tokenAddress
    )


    await decoProjectsStub.setProjectEndDateConfig(Math.floor(Date.now() / 1000) - 60)
    await acceptAndCheckState()
    await decoProjectsStub.setProjectEndDateConfig(Math.floor(Date.now() / 1000) - 60)
    await acceptAndCheckState()
  })

  it("should reject delivered milestone by client", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )

    let rejectAndCheckState = async (shouldOverdue, howMuchTimesToDeliverReject) => {
      let milestoneArray = await decoMilestonesMock.projectMilestones.call(
        testAgreementHash,
        0
      )
      let milestone = new Milestone(milestoneArray)
      let durationToWait = Date.now() - milestone.startedTime.plus(milestone.adjustedDuration).toNumber()
      let blockedAmount, makerWithdrawalAllowance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await IncreaseTime(shouldOverdue ? durationToWait : undefined)

      let startedTime, duration, deliveredTime, txn
      let timesToRun = howMuchTimesToDeliverReject == undefined ? 1 : howMuchTimesToDeliverReject
      for(var i = 0; i < timesToRun; i++) {
        await decoMilestonesMock.deliverLastMilestone(
          testAgreementHash, {from: maker, gasPrice: 1}
        )
        await IncreaseTime()
        milestoneArray = await decoMilestonesMock.projectMilestones.call(
          testAgreementHash,
          0
        )
        milestone = new Milestone(milestoneArray)
        startedTime = milestone.startedTime
        duration = milestone.adjustedDuration
        deliveredTime = milestone.deliveredTime
        txn = await decoMilestonesMock.rejectLastDeliverable(
          testAgreementHash,
          {from: client, gasPrice: 1}
        )
      }

      let actualBlockedAmount, actualMakerWithdrawalAllowance
      actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
      actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
      expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      milestoneArray = await decoMilestonesMock.projectMilestones.call(
        testAgreementHash,
        0
      )
      milestone = new Milestone(milestoneArray)

      let rejectionTime = new BigNumber(blockInfo.timestamp)
      let timeAmountAdded = new BigNumber(0)
      let emittedEvent = txn.logs[0]
      if(startedTime.plus(duration).gt(deliveredTime)) {
        timeAmountAdded = rejectionTime.minus(deliveredTime)

        expect(emittedEvent.event).to.be.equal("LogMilestoneDurationAdjusted")
        expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
        expect(emittedEvent.args.sender).to.be.equal(client)
        expect(emittedEvent.args.amountAdded.toString()).to.be.equal(timeAmountAdded.toString())
        expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
        emittedEvent = txn.logs[1]
      }
      expect(milestone.adjustedDuration.toString()).to.be.equal(
        duration.plus(timeAmountAdded).toString()
      )

      expect(milestone.acceptedTime.toString()).to.be.equal("0")
      expect(milestone.deliveredTime.toString()).to.be.equal("0")

      let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
      expect(projectEndDate.toString()).to.be.equal("0")

      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(client)
      expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
      expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
      expect(emittedEvent.args.state.toString()).to.be.equal("3")
    }

    await rejectAndCheckState(false)
    await rejectAndCheckState(false, 3)
    await rejectAndCheckState(true)
    await rejectAndCheckState(true, 4)
  })

  it("should fail rejecting delivered milestone by not a client.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )
    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )


    let rejectAndCheckState = async (sender) => {
      let milestoneArray = await decoMilestonesMock.projectMilestones.call(
        testAgreementHash,
        0
      )
      let milestone = new Milestone(milestoneArray)
      let startedTime = milestone.startedTime
      let duration = milestone.adjustedDuration
      let deliveredTime = milestone.deliveredTime

      let blockedAmount, makerWithdrawalAllowance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await IncreaseTime()

      await decoMilestonesMock.rejectLastDeliverable(
        testAgreementHash,
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let actualBlockedAmount, actualMakerWithdrawalAllowance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
        milestoneArray = await decoMilestonesMock.projectMilestones.call(
          testAgreementHash,
          0
        )
        milestone = new Milestone(milestoneArray)

        expect(milestone.deliveredTime.toString()).to.be.equal(deliveredTime.toString())
        expect(milestone.adjustedDuration.toString()).to.be.equal(duration.toString())

        expect(milestone.acceptedTime.toString()).to.be.equal("0")

        let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
        expect(projectEndDate.toString()).to.be.equal("0")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await rejectAndCheckState(accounts[8])
    await rejectAndCheckState(accounts[9])
    await rejectAndCheckState(accounts[7])
    await rejectAndCheckState(accounts[6])
  })

  it(
    "should fail rejecting milestone if it is not delivered, or already accepted, or on hold, or project is not active/started.",
    async () => {
      await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      escrowEthBalance = new BigNumber(escrowEthBalance)

      let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = ZERO_ADDRESS

      let rejectAndCheckState = async () => {
        let milestoneArray, milestone, startedTime, duration, deliveredTime
        let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
        if (count.toString() !== "0") {
          milestoneArray = await decoMilestonesMock.projectMilestones.call(
            testAgreementHash,
            0
          )
          milestone = new Milestone(milestoneArray)
          startedTime = milestone.startedTime
          duration = milestone.adjustedDuration
          deliveredTime = milestone.deliveredTime
        }

        let blockedAmount, makerWithdrawalAllowance
        blockedAmount = await decoEscrowStub.blockedBalance.call()
        makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

        await IncreaseTime()

        await decoMilestonesMock.rejectLastDeliverable(
          testAgreementHash,
          {from: client, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          let actualBlockedAmount, actualMakerWithdrawalAllowance
          actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
          actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

          expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
          expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
          if(count.toString() === "0") return
          milestoneArray = await decoMilestonesMock.projectMilestones.call(
            testAgreementHash,
            0
          )
          milestone = new Milestone(milestoneArray)

          expect(milestone.deliveredTime.toString()).to.be.equal(deliveredTime.toString())
          expect(milestone.adjustedDuration.toString()).to.be.equal(duration.toString())
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await decoProjectsStub.setIsProjectExistingConfig(false)
      await rejectAndCheckState()
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await rejectAndCheckState()
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await rejectAndCheckState()
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)
      await rejectAndCheckState()
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
      let lastBlock = await web3.eth.getBlock(web3.eth.defaultBlock)
      await IncreaseTime()
      await decoProjectsStub.setProjectEndDateConfig(lastBlock.timestamp)
      await IncreaseTime()
      await rejectAndCheckState()
      await decoProjectsStub.setProjectEndDateConfig(0)
      await decoMilestonesMock.acceptLastMilestone(testAgreementHash, {from: client, gasPrice: 1})
      await rejectAndCheckState()
    }
  )

  it("should terminate last milestone by maker or client.", async () => {
    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    let terminateAndCheckState = async (sender, shouldSkipStartingMilestone) => {
      if(!shouldSkipStartingMilestone) {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          mock.duration.toString(),
          { from: client, gasPrice: 1 }
        )
        await decoMilestonesMock.deliverLastMilestone(
          testAgreementHash, {from: maker, gasPrice: 1}
        )
      }
      await IncreaseTime(
        shouldSkipStartingMilestone ? milestoneStartWindow : feedbackWindow * 60 * 60 * 24 + 1
      )

      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      let txn = await decoProjectsStub.terminateProject(testAgreementHash, {from: sender, gasPrice: 1})
      let fee = Math.floor(mock.depositAmount.times(deconetShareFee).div(100).toNumber())

      let emittedEvents = await decoMilestonesMock.getPastEvents(
        "LogMilestoneStateUpdated",
        {fromBlock: "latest", toBlock: "latest"}
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
      actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
      actualBalance = await decoEscrowStub.balance.call()
      actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      if (!shouldSkipStartingMilestone) {
        if(sender == maker) {
          expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(
            mock.depositAmount.minus(fee).plus(makerWithdrawalAllowance).toString()
          )
          expect(actualBlockedAmount.toString()).to.be.equal(
            new BigNumber(blockedAmount).minus(mock.depositAmount).toString()
          )
        } else {
          expect(actualBlockedAmount.toString()).to.be.equal(
            new BigNumber(blockedAmount).minus(mock.depositAmount).toString()
          )
          expect(actualBalance.toString()).to.be.equal(
            mock.depositAmount.plus(balance).toString()
          )
        }

        let emittedEvent = emittedEvents[0]
        expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
        expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
        expect(emittedEvent.args.sender).to.be.equal(decoProjectsStub.address)
        expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
        expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
        expect(emittedEvent.args.state.toString()).to.be.equal("4")
      } else {
        if(sender == maker) {
          expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(
            makerWithdrawalAllowance.toString()
          )
          expect(actualBlockedAmount.toString()).to.be.equal(
            blockedAmount.toString()
          )
        } else {
          expect(actualBlockedAmount.toString()).to.be.equal(
            blockedAmount.toString()
          )
          expect(actualBalance.toString()).to.be.equal(balance.toString())
        }
        expect(emittedEvents).to.be.empty
      }

      BumpProjectId()
    }

    await terminateAndCheckState(maker, false)
    await terminateAndCheckState(client, false)
    await terminateAndCheckState(maker, true)
    await terminateAndCheckState(client, true)
    mock.depositAmount = new BigNumber(0)
    await terminateAndCheckState(maker, false)
    await terminateAndCheckState(client, false)
    await terminateAndCheckState(maker, true)
    await terminateAndCheckState(client, true)
  })

  it("should terminate last milestone with ERC20 tokens deposit by maker or client.", async () => {
    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    tokenBalance = new BigNumber(tokenBalance)

    let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await IncreaseTime(feedbackWindow * 60 * 60 * 24 + 1)

      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedTokensBalance.call(decoTestToken.address)
      balance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
      makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress(maker, decoTestToken.address)

      let txn = await decoProjectsStub.terminateProject(testAgreementHash, {from: sender, gasPrice: 1})
      let fee = Math.floor(mock.depositAmount.times(deconetShareFee).div(100).toNumber())

      let emittedEvents = await decoMilestonesMock.getPastEvents(
        "LogMilestoneStateUpdated",
        {fromBlock: "latest", toBlock: "latest"}
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
      actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(decoTestToken.address)
      actualBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
      actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress(
        maker,
        decoTestToken.address
      )

      expect(actualBlockedAmount.toString()).to.be.equal(
        new BigNumber(blockedAmount).minus(mock.depositAmount).toString()
      )
      if(sender == maker) {
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(
          mock.depositAmount.minus(fee).plus(makerWithdrawalAllowance).toString()
        )
      } else {
        expect(actualBalance.toString()).to.be.equal(
          mock.depositAmount.plus(balance).toString()
        )
      }

      let emittedEvent = emittedEvents[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(decoProjectsStub.address)
      expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
      expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(mock.milestoneNumber.toString())
      expect(emittedEvent.args.state.toString()).to.be.equal("4")
      BumpProjectId()
    }

    await terminateAndCheckState(maker)
    await terminateAndCheckState(client)
    mock.depositAmount = new BigNumber(0)
    await terminateAndCheckState(maker)
    await terminateAndCheckState(client)
  })

  it("should fail terminating milestone if initiator is not a client or a maker.", async () => {
    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await IncreaseTime(feedbackWindow * 60 * 60 * 24 + 1)

      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")

        let emittedEvents = await decoMilestonesMock.getPastEvents(
          "LogMilestoneStateUpdated",
          {fromBlock: "latest", toBlock: "latest"}
        )

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(emittedEvents).to.be.empty
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualBalance.toString()).to.be.equal(balance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      BumpProjectId()
    }

    await terminateAndCheckState(accounts[12])
    await terminateAndCheckState(accounts[10])
    await terminateAndCheckState(accounts[11])
    await terminateAndCheckState(accounts[13])
  })

  it("should fail terminating milestone if txn is sent not from project contract.", async () => {
    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await IncreaseTime(feedbackWindow * 60 * 60 * 24 + 1)

      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await decoMilestonesMock.terminateLastMilestone(
        testAgreementHash, sender, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let emittedEvents = await decoMilestonesMock.getPastEvents(
          "LogMilestoneStateUpdated",
          {fromBlock: "latest", toBlock: "latest"}
        )

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(emittedEvents).to.be.empty
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualBalance.toString()).to.be.equal(balance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      BumpProjectId()
    }

    await terminateAndCheckState(client)
    await terminateAndCheckState(maker)
    await terminateAndCheckState(client)
    await terminateAndCheckState(maker)
  })

  it("should fail terminating milestone if project doesn't exist.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(false)
    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    let terminateAndCheckState = async (sender) => {
      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let emittedEvents = await decoMilestonesMock.getPastEvents(
          "LogMilestoneStateUpdated",
          {fromBlock: "latest", toBlock: "latest"}
        )

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(emittedEvents).to.be.empty
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualBalance.toString()).to.be.equal(balance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      BumpProjectId()
    }

    await terminateAndCheckState(client)
    await terminateAndCheckState(maker)
  })

  it("should fail terminating milestone if client/maker can not terminate at the moment.", async () => {
    await decoMilestonesMock.setMockMakerCanTerminate(false)
    await decoMilestonesMock.setMockClientCanTerminate(false)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS


    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        mock.duration.toString(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await IncreaseTime(feedbackWindow * 60 * 60 * 24 + 1)

      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let emittedEvents = await decoMilestonesMock.getPastEvents(
          "LogMilestoneStateUpdated",
          {fromBlock: "latest", toBlock: "latest"}
        )

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(emittedEvents).to.be.empty
        expect(actualMakerWithdrawalAllowance.toString()).to.be.equal(makerWithdrawalAllowance.toString())
        expect(actualBlockedAmount.toString()).to.be.equal(blockedAmount.toString())
        expect(actualBalance.toString()).to.be.equal(balance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      BumpProjectId()
    }

    await terminateAndCheckState(client)
    await terminateAndCheckState(maker)
  })

  it("should correctly indicate if client can terminate.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS


    const getAndCheck = async (expectedValue) => {
      let canTerminate = await decoMilestonesMock.canClientTerminate(testAgreementHash)
      expect(canTerminate).to.be.equal(expectedValue)
    }

    await getAndCheck(false)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )

    await getAndCheck(false)

    await IncreaseTime(1)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await getAndCheck(false)

    await decoMilestonesMock.rejectLastDeliverable(testAgreementHash, {from: client, gasPrice: 1})

    await IncreaseTime(mock.duration.plus(10).toNumber())

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

    await getAndCheck(false)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)

    await getAndCheck(true)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await getAndCheck(true)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

    await getAndCheck(false)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)

    await decoMilestonesMock.acceptLastMilestone(
      testAgreementHash, {from: client, gasPrice: 1}
    )

    await getAndCheck(false)
  })

  it("should correctly indicate if maker can terminate.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    const getAndCheck = async (expectedValue) => {
      let canTerminate = await decoMilestonesMock.canMakerTerminate(testAgreementHash)
      expect(canTerminate).to.be.equal(expectedValue)
    }

    await getAndCheck(false)

    await IncreaseTime(milestoneStartWindow * 60 * 60 * 24 + 10)

    await getAndCheck(true)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )

    await getAndCheck(false)

    await IncreaseTime(1)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

    await getAndCheck(false)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)

    await getAndCheck(false)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await getAndCheck(false)

    await IncreaseTime(feedbackWindow * 60 * 60 * 24 + 1)

    await getAndCheck(true)

    await decoMilestonesMock.rejectLastDeliverable(testAgreementHash, {from: client, gasPrice: 1})

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

    await getAndCheck(false)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)

    await getAndCheck(false)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )

    await getAndCheck(false)

    await decoMilestonesMock.acceptLastMilestone(
      testAgreementHash, {from: client, gasPrice: 1}
    )

    await getAndCheck(false)

    await IncreaseTime(milestoneStartWindow * 60 * 60 * 24 + 1)

    await getAndCheck(true)
  })

  it("should correctly react and modify milestone state when a dispute starts.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      {from: client, gasPrice: 1}
    )

    let startDisputeAndCheck = async () => {
      let txn = await decoMilestonesMock.disputeStartedFreeze(testAgreementHash, {from: arbiter, gasPrice: 1})
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)

      let milestoneArray = await decoMilestonesMock.projectMilestones.call(
        testAgreementHash,
        mock.milestoneNumber.minus(1).toString()
      )
      expect(milestoneArray[0].toNumber()).to.not.be.equal(0)
      let milestone = new Milestone(milestoneArray)

      expect(milestone.isOnHold).to.be.true

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(arbiter)
      expect(emittedEvent.args.milestoneNumber.toString()).to.be.equal(
        mock.milestoneNumber.toString()
      )
      expect(emittedEvent.args.timestamp.toString()).to.be.equal(blockInfo.timestamp.toString())
      expect(emittedEvent.args.state.toString()).to.be.equal("5")

      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false);
    }

    await startDisputeAndCheck()
    await startDisputeAndCheck()
  })

  it("should fail putting milestone on hold when a dispute starts if sender is not an arbiter or there is no milestones.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    let startDisputeAndCheck = async (sender) => {
      await decoMilestonesMock.disputeStartedFreeze(
        testAgreementHash,
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let count = await decoMilestonesMock.countOfMilestones(testAgreementHash)
        if(count.toString() === "0") return

        let milestoneArray = await decoMilestonesMock.projectMilestones.call(
          testAgreementHash,
          mock.milestoneNumber.minus(1).toString()
        )
        let milestone = new Milestone(milestoneArray)

        expect(milestone.isOnHold).to.be.false
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await startDisputeAndCheck(arbiter)
    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      {from: client, gasPrice: 1}
    )
    await startDisputeAndCheck(accounts[10])
    await startDisputeAndCheck(accounts[11])
    await startDisputeAndCheck(accounts[12])
    await startDisputeAndCheck(accounts[13])
  })

  it("should correctly indicate if dispute can be started.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    let checkExpectedResult = async (expected) => {
      let canStart = await decoMilestonesMock.canStartDispute(testAgreementHash)
      expect(canStart).to.be.equal(expected)
    }

    await checkExpectedResult(false)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      {from: client, gasPrice: 1}
    )

    await checkExpectedResult(true)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

    await checkExpectedResult(false)

    await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)

    await decoMilestonesMock.markMilestoneAsDelivered(testAgreementHash)

    await checkExpectedResult(true)

    await decoProjectsStub.setProjectFeedbackWindow(0)

    await IncreaseTime(1)

    await checkExpectedResult(false)

    await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    await decoProjectsStub.setProjectFeedbackWindow(1)

    await checkExpectedResult(false)

    BumpProjectId()

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      "1",
      {from: client, gasPrice: 1}
    )
    await decoProjectsStub.setProjectFeedbackWindow(1)
    await checkExpectedResult(true)

    await IncreaseTime(2)

    await checkExpectedResult(false)

    await decoMilestonesMock.markMilestoneAsDelivered(testAgreementHash)

    await checkExpectedResult(false)

    BumpProjectId()

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      {from: client, gasPrice: 1}
    )

    await decoMilestonesMock.markMilestoneAsDelivered(testAgreementHash)

    await checkExpectedResult(true)

    await decoProjectsStub.setProjectFeedbackWindow(0)

    await IncreaseTime(1)

    await checkExpectedResult(false)
  })

  it("should correctly indicate eligibility status of an address to participate in a dispute.", async () => {
    let checkEligibility = async (expected, addressToCheck) => {
      let isEligible = await decoMilestonesMock.checkEligibility(testAgreementHash, addressToCheck)
      expect(isEligible).to.be.equal(expected)
    }

    await checkEligibility(true, client)
    await checkEligibility(false, accounts[10])
    await checkEligibility(false, accounts[11])
    await checkEligibility(true, maker)
  })

  it("should correctly react to settled dispute call.", async () => {
    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS
    await decoEscrowStub.depositErc20(decoTestToken.address, "1000000", {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    tokenBalance = new BigNumber(tokenBalance)

    let fixedFee = new BigNumber(1)
    let shareFee = new BigNumber(5)

    await decoProjectsStub.setArbiterFees("1", "5")

    let getBalanceFromEscrow = async (address, tokenAddress) => {
      if(tokenAddress == ZERO_ADDRESS) {
        if(address == client) {
          return await decoEscrowStub.balance.call()
        }
        return await decoEscrowStub.withdrawalAllowanceForAddress(address)
      } else {
        if(address == client) {
          return await decoEscrowStub.tokensBalance.call(tokenAddress)
        }
        return await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          address,
          tokenAddress
        )
      }
    }

    let settleDisputeAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, isInternal, withdrawalAddress
    ) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toString(),
        mock.tokenAddress,
        "1",
        {from: client, gasPrice: 1}
      )

      await decoMilestonesMock.disputeStartedFreeze(
        testAgreementHash,
        {from: arbiter, gasPrice: 1}
      )

      let respondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
      let initiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
      let arbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

      let txn = await decoMilestonesMock.disputeSettledTerminate(
        testAgreementHash,
        respondent,
        respondentShare,
        initiator,
        initiatorShare,
        isInternal,
        withdrawalAddress,
        {from: arbiter, gasPrice: 1}
      )
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let actualRespondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
      let actualInitiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
      let actualArbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

      let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
      expect(projectEndDate.toString()).to.be.equal(blockInfo.timestamp.toString())

      let distributedDepositAmount = mock.depositAmount
      if(!isInternal) {
        let arbiterFinalFeeAmount = new BigNumber(fixedFee).plus(
          Math.floor(
              mock.depositAmount.times(shareFee).div(100).toNumber()
            )
        )
        if(mock.tokenAddress != ZERO_ADDRESS) {
          arbiterFinalFeeAmount = new BigNumber(arbiterFinalFeeAmount).minus(fixedFee)
        }
        distributedDepositAmount = new BigNumber(distributedDepositAmount).minus(arbiterFinalFeeAmount)
        arbiterFinalFeeAmount = new BigNumber(arbiterFinalFeeAmount).minus(
          Math.floor(arbiterFinalFeeAmount.times(deconetShareFee).div(100).toNumber())
        )
        expect(new BigNumber(actualArbiterBalance.toString()).toNumber()).to.be.at.least(
          new BigNumber(arbiterBalance).plus(arbiterFinalFeeAmount).toNumber()
        )
      }
      let expectedAmount = new BigNumber(distributedDepositAmount).times(initiatorShare).div(100).times(
        100 - deconetShareFee
      ).div(100).toNumber()
      expect(new BigNumber(actualInitiatorBalance).toNumber()).to.be.at.least(
        new BigNumber(initiatorBalance).plus(Math.floor(expectedAmount)).toNumber()
      )
      expectedAmount = new BigNumber(distributedDepositAmount).times(respondentShare).div(100).times(
        100 - deconetShareFee
      ).div(100).toNumber()
      expect(new BigNumber(actualRespondentBalance).toNumber()).to.be.at.least(
        new BigNumber(respondentBalance).plus(Math.floor(expectedAmount)).toNumber()
      )

      BumpProjectId()
      await decoProjectsStub.setProjectEndDateConfig(0)
    }

    await settleDisputeAndCheckState(
      client, 25, maker, 75, false, arbiter
    )
    await settleDisputeAndCheckState(
      maker, 1, client, 99, true, arbiter
    )
    amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address
    await settleDisputeAndCheckState(
      client, 29, maker, 71, true, arbiter
    )
    await settleDisputeAndCheckState(
      maker, 87, client, 13, false, arbiter
    )
  })

  it(
    "should fail settled dispute call if called from not arbiter address or milestone is not on hold or there is no milestones.",
    async () => {
      await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      escrowEthBalance = new BigNumber(escrowEthBalance)

      let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = ZERO_ADDRESS

      let fixedFee = new BigNumber(1)
      let shareFee = new BigNumber(5)

      await decoProjectsStub.setArbiterFees(1, 5)

      let getBalanceFromEscrow = async (address, tokenAddress) => {
        if(tokenAddress == undefined) {
          if(address == client) {
            return await decoEscrowStub.balance.call()
          }
          return await decoEscrowStub.withdrawalAllowanceForAddress(address)
        } else {
          if(address == client) {
            return await decoEscrowStub.tokensBalance.call(tokenAddress)
          }
          return await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
            address,
            tokenAddress
          )
        }
      }

      let settleDisputeAndCheckState = async (
        respondent, respondentShare, initiator, initiatorShare, isInternal, withdrawalAddress, shouldStartDispute, shouldSkipStartMilestone
      ) => {
        if (!shouldSkipStartMilestone) {
          await decoMilestonesMock.startMilestone(
            testAgreementHash,
            mock.depositAmount.toString(),
            mock.tokenAddress,
            "1",
            {from: client, gasPrice: 1}
          )
        }

        let sender = arbiter
        if (shouldStartDispute) {
          await decoMilestonesMock.disputeStartedFreeze(
            testAgreementHash,
            {from: arbiter, gasPrice: 1}
          )
          sender = accounts[9]
        }

        let respondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
        let initiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
        let arbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

        await decoMilestonesMock.disputeSettledTerminate(
          testAgreementHash,
          respondent,
          respondentShare,
          initiator,
          initiatorShare,
          isInternal,
          withdrawalAddress,
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let actualRespondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
          let actualInitiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
          let actualArbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

          let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
          expect(projectEndDate.toString()).to.be.equal("0")
          expect(actualArbiterBalance.toString()).to.be.equal(arbiterBalance.toString())
          expect(actualInitiatorBalance.toString()).to.be.equal(initiatorBalance.toString())
          expect(actualRespondentBalance.toString()).to.be.equal(respondentBalance.toString())
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        BumpProjectId()
      }

      await settleDisputeAndCheckState(
        client, 25, maker, 75, false, arbiter, false, false
      )
      await settleDisputeAndCheckState(
        client, 35, maker, 65, false, arbiter, false, true
      )
      await settleDisputeAndCheckState(
        maker, 1, client, 99, true, arbiter, true, false
      )
      await settleDisputeAndCheckState(
        client, 29, maker, 71, true, arbiter, false, false
      )
      await settleDisputeAndCheckState(
        maker, 87, client, 13, false, arbiter, true, false
      )
  })

  it(
    "should fail settled dispute call if initiator or/and respondent are not valid, or shares sum is not 100.",
    async () => {
      maxNumberOfMilestones = 6
      await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()
      escrowEthBalance = new BigNumber(escrowEthBalance)

      let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = ZERO_ADDRESS

      let fixedFee = new BigNumber(1)
      let shareFee = new BigNumber(5)

      await decoProjectsStub.setArbiterFees(1, 5)

      let getBalanceFromEscrow = async (address, tokenAddress) => {
        if(tokenAddress == undefined) {
          if(address == client) {
            return await decoEscrowStub.balance.call()
          }
          return await decoEscrowStub.withdrawalAllowanceForAddress(address)
        } else {
          if(address == client) {
            return await decoEscrowStub.tokensBalance.call(tokenAddress)
          }
          return await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
            address,
            tokenAddress
          )
        }
      }

      let settleDisputeAndCheckState = async (
        respondent, respondentShare, initiator, initiatorShare, isInternal, withdrawalAddress
      ) => {
        await decoMilestonesMock.startMilestone(
          testAgreementHash,
          mock.depositAmount.toString(),
          mock.tokenAddress,
          "1",
          {from: client, gasPrice: 1}
        )

        await decoMilestonesMock.disputeStartedFreeze(
          testAgreementHash,
          {from: arbiter, gasPrice: 1}
        )

        let respondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
        let initiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
        let arbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

        await decoMilestonesMock.disputeSettledTerminate(
          testAgreementHash,
          respondent,
          respondentShare,
          initiator,
          initiatorShare,
          isInternal,
          withdrawalAddress,
          {from: arbiter, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Exception should be thrown for the transaction.")
          let actualRespondentBalance = await getBalanceFromEscrow(respondent, mock.tokenAddress)
          let actualInitiatorBalance = await getBalanceFromEscrow(initiator, mock.tokenAddress)
          let actualArbiterBalance = await getBalanceFromEscrow(arbiter, mock.tokenAddress)

          let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
          expect(projectEndDate.toString()).to.be.equal("0")
          expect(actualArbiterBalance.toString()).to.be.equal(arbiterBalance.toString())
          expect(actualInitiatorBalance.toString()).to.be.equal(initiatorBalance.toString())
          expect(actualRespondentBalance.toString()).to.be.equal(respondentBalance.toString())
        }).then((txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        BumpProjectId()
      }

      await settleDisputeAndCheckState(
        accounts[10], 25, maker, 75, false, arbiter
      )
      await settleDisputeAndCheckState(
        maker, 1, accounts[11], 99, true, arbiter
      )
      await settleDisputeAndCheckState(
        accounts[12], 29, accounts[13], 71, true, arbiter
      )
      await settleDisputeAndCheckState(
        client, 44, maker, 55, true, arbiter
      )
      await settleDisputeAndCheckState(
        maker, 44, maker, 75, true, arbiter
      )
      await settleDisputeAndCheckState(
        client, 30, maker, 75, true, arbiter
      )
  })

  it("should correctly return true and # if last milestone is accepted.", async () => {
    let checkIfActiveAndMilestoneNumber = async (isActive, milestoneNumber) => {
      let result = await decoMilestonesMock.isLastMilestoneAccepted(
        testAgreementHash
      )
      expect(result.isAccepted).to.be.equal(isActive)
      expect(result.milestoneNumber.toNumber()).to.be.equal(milestoneNumber)
    }

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    escrowEthBalance = new BigNumber(escrowEthBalance)

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = ZERO_ADDRESS

    await checkIfActiveAndMilestoneNumber(false, 0)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )
    await checkIfActiveAndMilestoneNumber(false, 1)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )
    await checkIfActiveAndMilestoneNumber(false, 1)

    await IncreaseTime()

    await decoMilestonesMock.acceptLastMilestone(
      testAgreementHash,
      {from: client, gasPrice: 1}
    )
    await checkIfActiveAndMilestoneNumber(true, 1)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toString(),
      mock.tokenAddress,
      mock.duration.toString(),
      { from: client, gasPrice: 1 }
    )
    await checkIfActiveAndMilestoneNumber(false, 2)

    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )
    await checkIfActiveAndMilestoneNumber(false, 2)

    await IncreaseTime()

    await decoMilestonesMock.acceptLastMilestone(
      testAgreementHash,
      {from: client, gasPrice: 1}
    )
    await checkIfActiveAndMilestoneNumber(true, 2)
  })
})
