const increaseTime = require("./helpers/time").increaseTime
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
    this.startedTime = contractStructArray[5]
    this.deliveredTime = contractStructArray[6]
    this.acceptedTime = contractStructArray[7]
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
    expect((new BigNumber(this.tokenAddress)).toNumber()).to.be.equal(
      (new BigNumber(this.tokenAddress)).toNumber()
    )
    expect(this.startedTime.eq(startedTime)).to.be.true
    expect(this.deliveredTime.eq(deliveredTime)).to.be.true
    expect(this.acceptedTime.eq(acceptedTime)).to.be.true
    expect(this.isOnHold).to.be.equal(isOnHold)
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
        "0x0",
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
      await decoEscrowStub.initialize(ownerAddress, decoMilestonesMock.address, {from: ownerAddress, gasPrice: 1})
    }
  }

  const BumpProjectId = () => {
    testAgreementHash = web3.sha3(`QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtWN${projectId++}`)
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
    let amount = web3.toWei(1000000)
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
  })

  it("should start a new milestone for the existing project.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

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
    "should fail starting a new milestone for ended project.",
    async () => {
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(10)
      await decoProjectsStub.setProjectEndDateConfig(Date.now() / 1000 - 60)

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
      await decoProjectsStub.setProjectEndDateConfig(0)
  })

  it("should manage to make a delivery by maker.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

    await decoEscrowStub.sendTransaction({from: accounts[8], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = escrowEthBalance.div(10)
    mock.tokenAddress = "0x0"

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      let txn = await decoMilestonesMock.deliverLastMilestone(testAgreementHash, {from: maker, gasPrice: 1})
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
      let milestone = new Milestone(milestoneArray)
      expect(milestone.deliveredTime.toNumber()).to.be.equal(blockInfo.timestamp)
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(maker)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
      expect(emittedEvent.args.state.toNumber()).to.be.equal(1)

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    }

    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
  })

  it("should fail delivering milestone that is not active.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    mock.depositAmount = tokenBalance.div(10)
    mock.tokenAddress = decoTestToken.address

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      if(milestoneId % 2 == 1) {
        await decoMilestonesMock.markMilestoneAsDelivered(testAgreementHash)
      } else {
        await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
      }
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toNumber()).to.not.be.equal(0)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
      await decoMilestonesMock.markMilestoneAsCompletedAndAccepted(testAgreementHash)
    }

    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
  })

  it("should fail delivering milestone that is frozen/on hold.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)
    mock.depositAmount = tokenBalance.div(10)
    mock.tokenAddress = decoTestToken.address

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toNumber()).to.be.equal(0)
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

    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
  })

  it("should fail delivering milestone by not a maker.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

    await decoEscrowStub.sendTransaction({from: accounts[4], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = escrowEthBalance.div(10)
    mock.tokenAddress = "0x0"

    let milestoneId = 0
    let deliverAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )

      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toNumber()).to.be.equal(0)
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
    await deliverAndCheckState(accounts[14])
  })

  it("should fail delivering milestone of a project that is not active.", async () => {
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(10)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()
    mock.depositAmount = escrowEthBalance.div(10)
    mock.tokenAddress = "0x0"

    let milestoneId = 0
    let deliverAndCheckState = async () => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )

      await decoProjectsStub.setProjectEndDateConfig(Date.now() / 1000 - 60)
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
        let milestone = new Milestone(milestoneArray)
        expect(milestone.deliveredTime.toNumber()).to.be.equal(0)
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

    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
    await deliverAndCheckState()
  })

  it("should accept delivered milestone successfully by client.", async () => {
    let maxNumberOfMilestones = 4
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let milestoneId = 0
    let acceptAndCheckState = async () => {

      if(milestoneId % 2 == 0) {
        let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
        mock.depositAmount = new BigNumber(amount)
        mock.tokenAddress = decoTestToken.address
      } else {
        let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
        mock.depositAmount = new BigNumber(amount)
        mock.tokenAddress = "0x0"
      }

      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
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

      expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.minus(mock.depositAmount).toNumber())
      expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(
        makerWithdrawalAllowance.plus(mock.depositAmount).toNumber()
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, milestoneId)
      let milestone = new Milestone(milestoneArray)

      expect(milestone.acceptedTime.toNumber()).to.be.above(0)

      let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
      expect(projectEndDate.eq(blockInfo.timestamp)).to.be.equal(
        mock.milestoneNumber.eq(maxNumberOfMilestones)
      )

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(client)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
      expect(emittedEvent.args.state.toNumber()).to.be.equal(2)

      milestoneId += 1
      mock.milestoneNumber = mock.milestoneNumber.plus(1)
    }

    for(var i = 0; i < maxNumberOfMilestones; i++) {
      await acceptAndCheckState()
    }
  })

  it("should fail accepting milestone by not a client", async () => {
    let maxNumberOfMilestones = 4
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

    let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
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
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
        let milestone = new Milestone(milestoneArray)

        expect(milestone.acceptedTime.toNumber()).to.be.equal(0)

        let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
        let projectCompleted = await decoProjectsStub.projectCompleted.call()
        expect(projectCompleted).to.be.false
        expect(projectEndDate.toNumber()).to.be.equal(0)

        let actualBlockedAmount = undefined
        let actualMakerWithdrawalAllowance = undefined
        actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
        actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
          maker,
          mock.tokenAddress
        )

        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
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
    "should fail accepting milestone if it is on hold, or not delivered, or already accepted.",
    async () => {
      let maxNumberOfMilestones = 4
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
      await decoProjectsStub.setProjectEndDateConfig(0)
      await decoProjectsStub.setProjectCompleted(false)

      await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
      let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

      let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = decoTestToken.address

      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )

      let blockedAmount = undefined
      let makerWithdrawalAllowance = undefined
      blockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
      makerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
        maker,
        mock.tokenAddress
      )

      let acceptAndCheckState = async (sender) => {
        await IncreaseTime()
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
        let milestone = new Milestone(milestoneArray)
        let acceptedTime = milestone.acceptedTime
        await decoMilestonesMock.acceptLastMilestone(
          testAgreementHash,
          {from: client, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
          milestone = new Milestone(milestoneArray)

          expect(milestone.acceptedTime.toNumber()).to.be.equal(acceptedTime.toNumber())

          let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
          let projectCompleted = await decoProjectsStub.projectCompleted.call()
          expect(projectCompleted).to.be.false
          expect(projectEndDate.toNumber()).to.be.equal(0)

          let actualBlockedAmount = undefined
          let actualMakerWithdrawalAllowance = undefined
          actualBlockedAmount = await decoEscrowStub.blockedTokensBalance.call(mock.tokenAddress)
          actualMakerWithdrawalAllowance = await decoEscrowStub.tokensWithdrawalAllowanceForAddress.call(
            maker,
            mock.tokenAddress
          )

          expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
          expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        }).then(async (txn) => {
          if (txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

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

  it("should fail accepting milestone when project is not active anymore.", async () => {
    let maxNumberOfMilestones = 4
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoEscrowStub.depositErc20(decoTestToken.address, 1000000, {from: accounts[0], gasPrice: 1})
    let tokenBalance = await decoEscrowStub.tokensBalance.call(decoTestToken.address)

    let amount = Math.floor(tokenBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = decoTestToken.address

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
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

    let acceptAndCheckState = async () => {
      await decoMilestonesMock.acceptLastMilestone(
        testAgreementHash,
        {from: client, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let milestoneArray = await decoMilestonesMock.getMilestone(testAgreementHash, 0)
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

        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await decoProjectsStub.setProjectEndDateConfig(Date.now() / 1000 - 60)
    await acceptAndCheckState()
    await decoProjectsStub.setProjectEndDateConfig(Date.now() / 1000 - 60)
    await acceptAndCheckState()
  })

  it("should reject delivered milestone by client", async () => {
    let maxNumberOfMilestones = 4
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
      { from: client, gasPrice: 1 }
    )

    let rejectAndCheckState = async (shouldOverdue, howMuchTimesToDeliverReject) => {
      let milestoneArray = await decoMilestonesMock.getMilestone(
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
        milestoneArray = await decoMilestonesMock.getMilestone(
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

      expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
      expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      milestoneArray = await decoMilestonesMock.getMilestone(
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
        expect(emittedEvent.args.amountAdded.toNumber()).to.be.equal(timeAmountAdded.toNumber())
        expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
        expect(emittedEvent.args.adjustmentType.toNumber()).to.be.equal(0)
        emittedEvent = txn.logs[1]
      }
      expect(milestone.adjustedDuration.toNumber()).to.be.equal(
        duration.plus(timeAmountAdded).toNumber()
      )

      expect(milestone.acceptedTime.toNumber()).to.be.equal(0)
      expect(milestone.deliveredTime.toNumber()).to.be.equal(0)

      let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
      expect(projectEndDate.toNumber()).to.be.equal(0)

      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(client)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
      expect(emittedEvent.args.state.toNumber()).to.be.equal(3)
    }

    await rejectAndCheckState(false)
    await rejectAndCheckState(false, 3)
    await rejectAndCheckState(true)
    await rejectAndCheckState(true, 4)
  })

  it("should fail rejecting delivered milestone by not a client.", async () => {
    let maxNumberOfMilestones = 4
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
      { from: client, gasPrice: 1 }
    )
    await decoMilestonesMock.deliverLastMilestone(
      testAgreementHash, {from: maker, gasPrice: 1}
    )


    let rejectAndCheckState = async (sender) => {
      let milestoneArray = await decoMilestonesMock.getMilestone(
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

        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        milestoneArray = await decoMilestonesMock.getMilestone(
          testAgreementHash,
          0
        )
        milestone = new Milestone(milestoneArray)

        expect(milestone.deliveredTime.toNumber()).to.be.equal(deliveredTime.toNumber())
        expect(milestone.adjustedDuration.toNumber()).to.be.equal(duration.toNumber())

        expect(milestone.acceptedTime.toNumber()).to.be.equal(0)

        let projectEndDate = await decoProjectsStub.getProjectEndDate(testAgreementHash)
        expect(projectEndDate.toNumber()).to.be.equal(0)
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
    "should fail rejecting milestone if it is not delivered, or already accepted, or on hold, or project is not active.",
    async () => {
      let maxNumberOfMilestones = 4
      await decoProjectsStub.setIsProjectExistingConfig(true)
      await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
      await decoProjectsStub.setProjectEndDateConfig(0)
      await decoProjectsStub.setProjectCompleted(false)

      await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
      let escrowEthBalance = await decoEscrowStub.balance.call()

      let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
      mock.depositAmount = new BigNumber(amount)
      mock.tokenAddress = "0x0"

      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
        { from: client, gasPrice: 1 }
      )
      let rejectAndCheckState = async (sender) => {
        let milestoneArray = await decoMilestonesMock.getMilestone(
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

          expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
          expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
          milestoneArray = await decoMilestonesMock.getMilestone(
            testAgreementHash,
            0
          )
          milestone = new Milestone(milestoneArray)

          expect(milestone.deliveredTime.toNumber()).to.be.equal(deliveredTime.toNumber())
          expect(milestone.adjustedDuration.toNumber()).to.be.equal(duration.toNumber())
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await rejectAndCheckState()
      await decoMilestonesMock.deliverLastMilestone(
        testAgreementHash, {from: maker, gasPrice: 1}
      )
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, true)
      await rejectAndCheckState()
      await decoMilestonesMock.markMilestoneAsOnHold(testAgreementHash, false)
      await decoProjectsStub.setProjectEndDateConfig(Date.now() / 1000 - 60)
      await rejectAndCheckState()
      await decoProjectsStub.setProjectEndDateConfig(0)
      await decoMilestonesMock.acceptLastMilestone(testAgreementHash, {from: client, gasPrice: 1})
      await rejectAndCheckState()
    }
  )

  it("should terminate last milestone by maker or client.", async () => {
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
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

      let observer = decoMilestonesMock.LogMilestoneStateUpdated()

      let txn = await decoProjectsStub.terminateProject(testAgreementHash, {from: sender, gasPrice: 1})

      let events = await observer.get()
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
      actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
      actualBalance = await decoEscrowStub.balance.call()
      actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      if(sender == maker) {
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(
          makerWithdrawalAllowance.plus(mock.depositAmount).toNumber()
        )
        expect(actualBlockedAmount.toNumber()).to.be.equal(
          blockedAmount.minus(mock.depositAmount).toNumber()
        )
      } else {
        expect(actualBlockedAmount.toNumber()).to.be.equal(
          blockedAmount.minus(mock.depositAmount).toNumber()
        )
        expect(actualBalance.toNumber()).to.be.equal(balance.plus(mock.depositAmount).toNumber())
      }

      emittedEvent = events[0]
      expect(emittedEvent.event).to.be.equal("LogMilestoneStateUpdated")
      expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
      expect(emittedEvent.args.sender).to.be.equal(decoProjectsStub.address)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.milestoneNumber.toNumber()).to.be.equal(mock.milestoneNumber.toNumber())
      expect(emittedEvent.args.state.toNumber()).to.be.equal(4)
      BumpProjectId()
    }

    await terminateAndCheckState(maker)
    await terminateAndCheckState(client)
    await terminateAndCheckState(maker)
    await terminateAndCheckState(client)
  })

  it("should fail terminating milestone if initiator is not a client or a maker.", async () => {
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
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

      let observer = decoMilestonesMock.LogMilestoneStateUpdated()

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let events = await observer.get()

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(events).to.be.empty
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualBalance.toNumber()).to.be.equal(balance.toNumber())
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    await decoProjectsStub.setIsProjectExistingConfig(true)
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setProjectCompleted(false)

    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
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

      let observer = decoMilestonesMock.LogMilestoneStateUpdated()

      await decoMilestonesMock.terminateLastMilestone(
        testAgreementHash, sender, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let events = await observer.get()

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(events).to.be.empty
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualBalance.toNumber()).to.be.equal(balance.toNumber())
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(false)

    await decoMilestonesMock.setMockMakerCanTerminate(true)
    await decoMilestonesMock.setMockClientCanTerminate(true)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    let terminateAndCheckState = async (sender) => {
      let blockedAmount, makerWithdrawalAllowance, balance
      blockedAmount = await decoEscrowStub.blockedBalance.call()
      balance = await decoEscrowStub.balance.call()
      makerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)

      let observer = decoMilestonesMock.LogMilestoneStateUpdated()

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let events = await observer.get()

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(events).to.be.empty
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualBalance.toNumber()).to.be.equal(balance.toNumber())
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(true)

    await decoMilestonesMock.setMockMakerCanTerminate(false)
    await decoMilestonesMock.setMockClientCanTerminate(false)
    await decoMilestonesMock.setSkipCanTerminateLogic(true)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"


    let terminateAndCheckState = async (sender) => {
      await decoMilestonesMock.startMilestone(
        testAgreementHash,
        mock.depositAmount.toNumber(),
        mock.tokenAddress,
        mock.duration.toNumber(),
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

      let observer = decoMilestonesMock.LogMilestoneStateUpdated()

      await decoProjectsStub.terminateProject(
        testAgreementHash, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let events = await observer.get()

        let actualBlockedAmount, actualMakerWithdrawalAllowance, actualBalance
        actualBlockedAmount = await decoEscrowStub.blockedBalance.call()
        actualBalance = await decoEscrowStub.balance.call()
        actualMakerWithdrawalAllowance = await decoEscrowStub.withdrawalAllowanceForAddress(maker)
        expect(events).to.be.empty
        expect(actualMakerWithdrawalAllowance.toNumber()).to.be.equal(makerWithdrawalAllowance.toNumber())
        expect(actualBlockedAmount.toNumber()).to.be.equal(blockedAmount.toNumber())
        expect(actualBalance.toNumber()).to.be.equal(balance.toNumber())
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    let milestoneStartWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(true)

    await decoMilestonesMock.setSkipCanTerminateLogic(false)

    await decoProjectsStub.setProjectFeedbackWindow(feedbackWindow)
    await decoProjectsStub.setProjectMilestoneStartWindow(milestoneStartWindow)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"


    const getAndCheck = async (expectedValue) => {
      let canTerminate = await decoMilestonesMock.canClientTerminate(testAgreementHash)
      expect(canTerminate).to.be.equal(expectedValue)
    }

    await getAndCheck(false)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    let milestoneStartWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(true)

    await decoMilestonesMock.setSkipCanTerminateLogic(false)

    await decoProjectsStub.setProjectFeedbackWindow(feedbackWindow)
    await decoProjectsStub.setProjectMilestoneStartWindow(milestoneStartWindow)


    let lastBlock = await web3.eth.getBlock(web3.eth.blockNumber)

    await decoProjectsStub.setProjectStartDateConfig(lastBlock.timestamp)

    await decoEscrowStub.sendTransaction({from: accounts[9], value: 1000000, gasPrice: 1})
    let escrowEthBalance = await decoEscrowStub.balance.call()

    let amount = Math.floor(escrowEthBalance.div(maxNumberOfMilestones).toNumber())
    mock.depositAmount = new BigNumber(amount)
    mock.tokenAddress = "0x0"

    const getAndCheck = async (expectedValue) => {
      let canTerminate = await decoMilestonesMock.canMakerTerminate(testAgreementHash)
      expect(canTerminate).to.be.equal(expectedValue)
    }

    await getAndCheck(false)

    await IncreaseTime(milestoneStartWindow * 60 * 60 * 24 + 10)

    await getAndCheck(true)

    await decoMilestonesMock.startMilestone(
      testAgreementHash,
      mock.depositAmount.toNumber(),
      mock.tokenAddress,
      mock.duration.toNumber(),
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
    let maxNumberOfMilestones = 4
    let feedbackWindow = 1
    let milestoneStartWindow = 1
    await decoProjectsStub.setProjectMilestonesCountConfig(maxNumberOfMilestones)
    await decoProjectsStub.setProjectCompleted(false)
    await decoProjectsStub.setProjectEndDateConfig(0)
    await decoProjectsStub.setIsProjectExistingConfig(true)

    await decoMilestonesMock.setSkipCanTerminateLogic(false)

    await decoProjectsStub.setProjectFeedbackWindow(feedbackWindow)
    await decoProjectsStub.setProjectMilestoneStartWindow(milestoneStartWindow)

    let lastBlock = await web3.eth.getBlock(web3.eth.blockNumber)

    await decoProjectsStub.setProjectStartDateConfig(lastBlock.timestamp)

  })
})
