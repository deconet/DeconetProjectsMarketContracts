const increaseTime = require("./helpers/time").increaseTime
var BigNumber = require("bignumber.js")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")
var DecoArbitrationTargetStub = artifacts.require("./DecoArbitrationTargetStub.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoArbitrationStub = artifacts.require("./DecoArbitrationStub.sol")

class Eligibility {
  constructor(status, target) {
    this.status = status
    this.target = target
  }

  async saveInStub(stubContract, sender) {
    await stubContract.setEligibility(this.status, this.target, {from: sender, gasPrice: 1})
  }
}

contract("DecoArbitration", async (accounts) => {
  let relay, arbitrationTargetStub, arbitration, arbitrationStub
  let id = 0
  let idHash = ''

  const ConfigureTargetStub = async (canStart, eligibilities) => {
    await arbitrationTargetStub.setIfCanStartDispute(canStart)
    for (var i = 0; i < eligibilities.length; i++) {
      await eligibilities[i].saveInStub(arbitrationTargetStub, accounts[0])
    }
  }

  const StartDispute = async (idHash, respondent, respondentShareProposal, sender) => {
    return arbitration.startDispute(idHash, respondent, respondentShareProposal, {from: sender, gasPrice: 1})
  }

  const EndDispute = async (idHash, respondentShare, initiatorShare, sender) => {
    return arbitration.settleDispute(idHash, respondentShare, initiatorShare, {from: sender, gasPrice: 1})
  }

  const StartDisputeInStub = async (idHash, respondent, respondentShareProposal, sender) => {
    return arbitrationStub.startDispute(idHash, respondent, respondentShareProposal, {from: sender, gasPrice: 1})
  }

  const EndDisputeInStubInternally = async (idHash, respondentShare, initiatorShare, sender) => {
    return arbitrationStub.simulateInternalSettleDisputeCall(
      idHash,
      respondentShare,
      initiatorShare,
      {from: sender, gasPrice: 1}
    )
  }

  const EndDisputeInStub = async (idHash, respondentShare, initiatorShare, sender) => {
    return arbitrationStub.settleDispute(
      idHash,
      respondentShare,
      initiatorShare,
      {from: sender, gasPrice: 1}
    )
  }

  const SetTimeLimitInStub = async (timeLimit) => {
    await increaseTime(1000)
    return arbitrationStub.setTimeLimitForReplyOnProposal(timeLimit)
  }

  const SetTimeLimit = async (timeLimit) => {
    await increaseTime(1000)
    return arbitration.setTimeLimitForReplyOnProposal(timeLimit)
  }

  const AcceptProposal = async (idHash, sender) => {
    return arbitration.acceptProposal(idHash, {from: sender, gasPrice: 1})
  }

  const RejectProposal = async (idHash, sender) => {
    return arbitration.rejectProposal(idHash, {from: sender, gasPrice: 1})
  }

  const UpdateIdHash = () => {
    idHash = web3.sha3(`${id++}`)
  }

  before(async () => {
    arbitration = await DecoArbitration.deployed()
    relay = await DecoRelay.deployed()
    arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})
    arbitrationStub.setRelayContractAddress(relay.address, {from: accounts[0], gasPrice: 1})
    await SetTimeLimitInStub(10000000000)
  })

  beforeEach(async () => {
    arbitrationTargetStub = await DecoArbitrationTargetStub.new({ from: accounts[1], gasPrice: 1 })
    relay.setMilestonesContractAddress(arbitrationTargetStub.address, {from: accounts[0], gasPrice: 1})
    let owner = await arbitration.owner()
    await arbitration.setRelayContractAddress(relay.address, {from: owner, gasPrice: 1})
    UpdateIdHash()
  })

  it("should start dispute correctly.", async () => {
    let startAndCheckState = async (shareProposal, respondent, sender) => {
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, sender)
        ]
      )
      let hash = idHash
      let txn = await StartDispute(hash, respondent, shareProposal, sender)
      let isStarted = await arbitration.getDisputeStartedStatus(hash)
      let startedTime = await arbitration.getDisputeStartTime(hash)
      let disputeProposal = await arbitration.getDisputeProposalShare(hash)
      let disputeInitiator = await arbitration.getDisputeInitiator(hash)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(startedTime.toNumber()).to.be.equal(blockInfo.timestamp)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      expect(isStartedInStub).to.be.true

      let proposal = shareProposal > 100 || shareProposal < 0 ? 0 : shareProposal
      expect(isStarted).to.be.true
      expect(disputeProposal.toNumber()).to.be.equal(proposal)
      expect(disputeInitiator).to.be.equal(sender)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogStartedDispute')
      expect(emittedEvent.args.sender).to.be.equal(sender)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.respondentShareProposal.toNumber()).to.be.equal(
        shareProposal
      )

      UpdateIdHash()
    }

    await startAndCheckState(67, accounts[2], accounts[3])
    await startAndCheckState(3, accounts[3], accounts[4])
    await startAndCheckState(1, accounts[4], accounts[5])
    await startAndCheckState(99, accounts[5], accounts[6])
    await startAndCheckState(199, accounts[5], accounts[6])
  })

  it("should fail starting dispute if a user is not eligible for that.", async () => {
    let startAndCheckState = async (
      shareProposal, respondent, isRespondentEgligible, sender, isSenderEligible
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(isRespondentEgligible, respondent),
          new Eligibility(isSenderEligible, sender)
        ]
      )
      await StartDispute(hash, respondent, shareProposal, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")

        let isStarted = await arbitration.getDisputeStartedStatus(hash)
        expect(isStarted).to.be.false
        let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
        expect(isStartedInStub).to.be.false
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    await startAndCheckState(67, accounts[2], true, accounts[3], false)
    await startAndCheckState(3, accounts[3], false, accounts[4], true)
    await startAndCheckState(1, accounts[4], false,  accounts[5], false)
    await startAndCheckState(99, accounts[5], false, accounts[6], true)
    await startAndCheckState(-99, accounts[5], true, accounts[6], false)
    await startAndCheckState(199, accounts[8], false, accounts[7], true)
    await startAndCheckState(101, accounts[9], false, accounts[8], false)
  })

  it("should fail starting dispute if there is already one active.", async () => {
    let startAndCheckState = async (shareProposal, respondent, sender) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, sender)
        ]
      )
      let txn = await StartDispute(hash, respondent, shareProposal, sender)
      await StartDispute(hash, respondent, shareProposal, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")
        let isStarted = await arbitration.getDisputeStartedStatus(hash)
        let startedTime = await arbitration.getDisputeStartTime(hash)
        let disputeProposal = await arbitration.getDisputeProposalShare(hash)
        let disputeInitiator = await arbitration.getDisputeInitiator(hash)

        let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
        expect(startedTime.toNumber()).to.be.equal(blockInfo.timestamp)

        let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
        expect(isStartedInStub).to.be.true


        let proposal = shareProposal > 100 || shareProposal < 0 ? 0 : shareProposal
        expect(isStarted).to.be.true
        expect(disputeProposal.toNumber()).to.be.equal(proposal)
        expect(disputeInitiator).to.be.equal(sender)
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    await startAndCheckState(67, accounts[2], accounts[3])
    await startAndCheckState(97, accounts[3], accounts[4])
    await startAndCheckState(109, accounts[4], accounts[5])
  })

  it("should fail starting dispute if target is not ready.", async () => {
    let startAndCheckState = async (shareProposal, respondent, sender) => {
      let hash = idHash
      await ConfigureTargetStub(
        false,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, sender)
        ]
      )
      await StartDispute(hash, respondent, shareProposal, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")

        let isStarted = await arbitration.getDisputeStartedStatus(hash)
        expect(isStarted).to.be.false
        let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
        expect(isStartedInStub).to.be.false
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    await startAndCheckState(21, accounts[9], accounts[3])
    await startAndCheckState(12, accounts[11], accounts[4])
    await startAndCheckState(-1, accounts[17], accounts[5])
  })

  it("should start and settle dispute straight when proposal is 100% for respondent.", async () => {
    let startAndCheckState = async (shareProposal, respondent, sender) => {
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, sender)
        ]
      )
      let hash = idHash
      let txn = await StartDispute(hash, respondent, shareProposal, sender)
      let isStarted = await arbitration.getDisputeStartedStatus(hash)
      let startedTime = await arbitration.getDisputeStartTime(hash)
      let isEnded = await arbitration.getDisputeSettledStatus(hash)
      let endTime = await arbitration.getDisputeSettlementTime(hash)
      let disputeProposal = await arbitration.getDisputeProposalShare(hash)
      let disputeInitiator = await arbitration.getDisputeInitiator(hash)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(startedTime.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(endTime.toNumber()).to.be.equal(blockInfo.timestamp)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      expect(isStartedInStub).to.be.false
      let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()
      expect(isEndedInStub).to.be.true

      let proposal = shareProposal > 100 || shareProposal < 0 ? 0 : shareProposal
      expect(isStarted).to.be.true
      expect(isEnded).to.be.true
      expect(disputeProposal.toNumber()).to.be.equal(proposal)
      expect(disputeInitiator).to.be.equal(sender)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogStartedDispute')
      expect(emittedEvent.args.sender).to.be.equal(sender)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.respondentShareProposal.toNumber()).to.be.equal(proposal)

      emittedEvent = txn.logs[1]
      expect(emittedEvent.event).to.be.equal('LogSettledDispute')
      expect(emittedEvent.args.sender).to.be.equal(arbitration.address)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.respondentShare.toNumber()).to.be.equal(proposal)
      expect(emittedEvent.args.initiatorShare.toNumber()).to.be.equal(0)

      UpdateIdHash()
    }

    await startAndCheckState(100, accounts[2], accounts[3])
    await startAndCheckState(100, accounts[3], accounts[4])
    await startAndCheckState(100, accounts[4], accounts[5])
    await startAndCheckState(100, accounts[5], accounts[6])
    await startAndCheckState(100, accounts[7], accounts[8])
  })

  it("should settle dispute successfully by arbiter or contract.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter, isInternal
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDisputeInStub(hash, respondent, isInternal ? respondentShare : -1, initiator)
      let txn
      if(isInternal) {
        await SetTimeLimitInStub(100000000000)
        txn = await EndDisputeInStubInternally(hash, respondentShare, initiatorShare, arbiter)
      } else {
        await SetTimeLimitInStub(0)
        txn = await EndDisputeInStub(hash, respondentShare, initiatorShare, arbiter)
      }

      let isStarted = await arbitrationStub.getDisputeStartedStatus(hash)
      let startedTime = await arbitrationStub.getDisputeStartTime(hash)
      let isEnded = await arbitrationStub.getDisputeSettledStatus(hash)
      let endTime = await arbitrationStub.getDisputeSettlementTime(hash)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(endTime.toNumber()).to.be.equal(blockInfo.timestamp)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

      expect(isStarted).to.be.true
      expect(isEnded).to.be.true
      expect(isStartedInStub).to.be.true
      expect(isEndedInStub).to.be.true

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogSettledDispute')
      expect(emittedEvent.args.sender).to.be.equal(isInternal ? arbitrationStub.address : arbiter)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.respondentShare.toNumber()).to.be.equal(respondentShare)
      expect(emittedEvent.args.initiatorShare.toNumber()).to.be.equal(initiatorShare)

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitrationStub.owner()

    await startAndCheckState(accounts[2], 1, accounts[3], 99, arbitrationContractOwner, false)
    await startAndCheckState(accounts[3], 19, accounts[4], 81, arbitrationContractOwner, false)
    await startAndCheckState(accounts[4], 79, accounts[5], 21, arbitrationContractOwner, false)
    await startAndCheckState(accounts[5], 72, accounts[6], 28, accounts[7], true)
    await startAndCheckState(accounts[8], 47, accounts[9], 53, accounts[10], true)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, accounts[11], true)
    await SetTimeLimitInStub(0)
    await startAndCheckState(accounts[15], 0, accounts[16], 100, arbitrationContractOwner, false)
  })

  it("should fail ending dispute if sender of a transaction is not eligible for that.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, -100, initiator)
      await EndDispute(hash, respondentShare, initiatorShare, arbiter).catch(async (err) => {
        assert.isOk(err, "Expected crash")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let endTime = await arbitration.getDisputeSettlementTime(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()
        expect(isEnded).to.be.false
        expect(isEndedInStub).to.be.false
        expect(endTime.toNumber()).to.be.equal(0)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    await startAndCheckState(accounts[5], 72, accounts[6], 28, accounts[7])
    await startAndCheckState(accounts[8], 47, accounts[9], 53, accounts[10])
    await startAndCheckState(accounts[9], 0, accounts[10], 100, accounts[11])
  })

  it("should fail ending dispute if it doesn't exist.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await EndDispute(hash, respondentShare, initiatorShare, arbiter).catch(async (err) => {
        assert.isOk(err, "Expected crash")

        let isStarted = await arbitration.getDisputeStartedStatus(hash)
        let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()

        expect(isStarted).to.be.false
        expect(isStartedInStub).to.be.false
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await startAndCheckState(accounts[5], 72, accounts[6], 28, arbitrationContractOwner)
    await startAndCheckState(accounts[8], 47, accounts[9], 53, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, arbitrationContractOwner)
  })

  it("should fail ending dispute if it has been settled heretofore.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, 101, initiator)
      await EndDispute(hash, respondentShare, initiatorShare, arbiter)
      await EndDispute(hash, respondentShare, initiatorShare, arbiter).catch(async (err) => {
        assert.isOk(err, "Expected crash")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

        expect(isEndedInStub).to.be.true
        expect(isEnded).to.be.true
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await startAndCheckState(accounts[5], 72, accounts[6], 28, arbitrationContractOwner)
    await startAndCheckState(accounts[8], 47, accounts[9], 53, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, arbitrationContractOwner)
  })

  it("should fail ending dispute if there is an active proposal.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter, isEmptyOnStart
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, isEmptyOnStart ? -1 : respondentShare, initiator)
      await EndDispute(hash, respondentShare, initiatorShare, arbiter).catch(async (err) => {
        assert.isOk(err, "Expected crash")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

        expect(isEndedInStub).to.be.false
        expect(isEnded).to.be.false
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await SetTimeLimit(1000000000)
    await startAndCheckState(accounts[5], 72, accounts[6], 28, arbitrationContractOwner, false)
    await startAndCheckState(accounts[8], 47, accounts[9], 53, arbitrationContractOwner, false)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, arbitrationContractOwner, false)
    await SetTimeLimit(0)
  })

  it("should fail ending dispute if provided shares sum isn't 100%.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, arbiter
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, -1, initiator)
      await EndDispute(hash, respondentShare, initiatorShare, arbiter).catch(async (err) => {
        assert.isOk(err, "Expected crash")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

        expect(isEndedInStub).to.be.false
        expect(isEnded).to.be.false
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await startAndCheckState(accounts[5], 70, accounts[6], 28, arbitrationContractOwner)
    await startAndCheckState(accounts[8], 57, accounts[9], 53, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 90, accounts[10], 100, arbitrationContractOwner)
    await startAndCheckState(accounts[11], 0, accounts[12], 0, arbitrationContractOwner)
  })


  it("should accept proposal successfully from respondent address", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, respondentShare, initiator)
      await SetTimeLimit(10000000)
      let txn = await AcceptProposal(hash, respondent)

      let isStarted = await arbitration.getDisputeStartedStatus(hash)
      let startedTime = await arbitration.getDisputeStartTime(hash)
      let isEnded = await arbitration.getDisputeSettledStatus(hash)
      let endTime = await arbitration.getDisputeSettlementTime(hash)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(endTime.toNumber()).to.be.equal(blockInfo.timestamp)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

      expect(isStarted).to.be.true
      expect(isEnded).to.be.true
      expect(isStartedInStub).to.be.true
      expect(isEndedInStub).to.be.true

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogSettledDispute')
      expect(emittedEvent.args.sender).to.be.equal(arbitration.address)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.respondentShare.toNumber()).to.be.equal(respondentShare)
      expect(emittedEvent.args.initiatorShare.toNumber()).to.be.equal(initiatorShare)

      UpdateIdHash()
    }

    await startAndCheckState(accounts[5], 72, accounts[6], 28)
    await startAndCheckState(accounts[8], 57, accounts[9], 43)
    await startAndCheckState(accounts[9], 0, accounts[10], 100)
  })

  it("should fail accepting proposal from non-respondent address", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, sender
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, respondentShare, initiator)
      await AcceptProposal(hash, sender).catch(async (err) => {
        assert.isOk(err, "Expected crash.")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let endTime = await arbitration.getDisputeSettlementTime(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

        expect(isEnded).to.be.false
        expect(isEndedInStub).to.be.false
        expect(endTime.toNumber()).to.be.equal(0)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await startAndCheckState(accounts[5], 72, accounts[6], 28, accounts[12])
    await startAndCheckState(accounts[6], 72, accounts[5], 28, accounts[5])
    await startAndCheckState(accounts[8], 57, accounts[9], 43, accounts[13])
    await startAndCheckState(accounts[9], 57, accounts[8], 43, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, accounts[14])
  })

  it("should fail accepting proposal if there is no active dispute or proposal.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, shouldStart, shouldKeepProposalInactive
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      if (shouldStart) {
        await StartDispute(hash, respondent, respondentShare, initiator)
        await SetTimeLimit(0)
        if (respondentShare != 100 && !shouldKeepProposalInactive) {
          let owner = await arbitration.owner()
          await EndDispute(hash, respondentShare, initiatorShare, owner)
        }
      } else {
        await SetTimeLimit(1000000000)
      }
      await AcceptProposal(hash, respondent).catch(async (err) => {
        assert.isOk(err, "Expected crash.")

        let isEnded = await arbitration.getDisputeSettledStatus(hash)
        let endTime = await arbitration.getDisputeSettlementTime(hash)
        let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

        if (shouldStart && !shouldKeepProposalInactive) {
          expect(isEnded).to.be.true
          expect(isEndedInStub).to.be.true
        } else {
          expect(isEnded).to.be.false
          expect(isEndedInStub).to.be.false
        }
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
      await arbitrationTargetStub.resetState()
    }

    await startAndCheckState(accounts[5], 72, accounts[6], 28, false, false)
    await startAndCheckState(accounts[12], 100, accounts[13], 0, true, false)
    await startAndCheckState(accounts[6], 71, accounts[5], 29, true, false)
    await startAndCheckState(accounts[8], 57, accounts[9], 43, false, true)
    await startAndCheckState(accounts[9], 56, accounts[8], 44, true, true)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, true, true)
    await startAndCheckState(accounts[10], 0, accounts[9], 100, false, false)
  })

  it("should reject proposal scuccessfully from respondent address", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, respondentShare, initiator)
      let txn = await RejectProposal(hash, respondent)

      let isStarted = await arbitration.getDisputeStartedStatus(hash)
      let startedTime = await arbitration.getDisputeStartTime(hash)
      let proposal = await arbitration.getDisputeProposalShare(hash)
      let savedInitiatorShare = await arbitration.getDisputeInitiatorShare(hash)
      let isEnded = await arbitration.getDisputeSettledStatus(hash)
      let endTime = await arbitration.getDisputeSettlementTime(hash)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(endTime.toNumber()).to.be.equal(0)
      expect(proposal.toNumber()).to.be.equal(0)
      expect(savedInitiatorShare.toNumber()).to.be.equal(0)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      let isEndedInStub = await arbitrationTargetStub.disputeEnded.call()

      expect(isStarted).to.be.true
      expect(isEnded).to.be.false
      expect(isStartedInStub).to.be.true
      expect(isEndedInStub).to.be.false

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogRejectedProposal')
      expect(emittedEvent.args.sender).to.be.equal(respondent)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.rejectedProposal.toNumber()).to.be.equal(respondentShare)

      UpdateIdHash()
    }

    await startAndCheckState(accounts[5], 72, accounts[6], 28)
    await startAndCheckState(accounts[8], 57, accounts[9], 43)
    await startAndCheckState(accounts[9], 0, accounts[10], 100)
  })

  it("should fail rejecting proposal from non-respondent address", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, sender
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      await StartDispute(hash, respondent, respondentShare, initiator)
      await RejectProposal(hash, sender).catch(async (err) => {
        assert.isOk(err, "Expected crash.")

        let proposal = await arbitration.getDisputeProposalShare(hash)
        let savedInitiatorShare = await arbitration.getDisputeInitiatorShare(hash)
        expect(proposal.toNumber()).to.be.equal(respondentShare)
        expect(savedInitiatorShare.toNumber()).to.be.equal(initiatorShare)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    let arbitrationContractOwner = await arbitration.owner()
    await startAndCheckState(accounts[5], 72, accounts[6], 28, accounts[12])
    await startAndCheckState(accounts[6], 72, accounts[5], 28, accounts[5])
    await startAndCheckState(accounts[8], 57, accounts[9], 43, accounts[13])
    await startAndCheckState(accounts[9], 57, accounts[8], 43, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, accounts[14])
  })

  it("should fail accepting proposal if there is no active dispute or proposal.", async () => {
    let startAndCheckState = async (
      respondent, respondentShare, initiator, initiatorShare, shouldStart, shouldKeepProposalInactive
    ) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      if (shouldStart) {
        await StartDispute(hash, respondent, respondentShare, initiator)
        await SetTimeLimit(0)
        if (respondentShare != 100 && !shouldKeepProposalInactive) {
          let owner = await arbitration.owner()
          await EndDispute(hash, respondentShare, initiatorShare, owner)
        }
      } else {
        await SetTimeLimit(1000000000)
      }
      await RejectProposal(hash, respondent).catch(async (err) => {
        assert.isOk(err, "Expected crash.")

        let proposal = await arbitration.getDisputeProposalShare(hash)
        let savedInitiatorShare = await arbitration.getDisputeInitiatorShare(hash)
        if (shouldStart) {
          expect(proposal.toNumber()).to.be.equal(respondentShare)
          expect(savedInitiatorShare.toNumber()).to.be.equal(initiatorShare)
        } else {
          expect(proposal.toNumber()).to.be.equal(0)
          expect(savedInitiatorShare.toNumber()).to.be.equal(0)
        }
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
      await arbitrationTargetStub.resetState()
    }

    await startAndCheckState(accounts[5], 72, accounts[6], 28, false, false)
    await startAndCheckState(accounts[12], 100, accounts[13], 0, true, false)
    await startAndCheckState(accounts[6], 71, accounts[5], 29, true, false)
    await startAndCheckState(accounts[8], 57, accounts[9], 43, false, true)
    await startAndCheckState(accounts[9], 56, accounts[8], 44, true, true)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, true, true)
    await startAndCheckState(accounts[10], 0, accounts[9], 100, false, false)
  })

  it("should set withdrawal address from owner address", async () => {
    let owner = await arbitration.owner()
    let setAndCheck = async (newAddress) => {
      let txn = await arbitration.setWithdrawalAddress(newAddress, {from: owner, gasPrice: 1})

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogWithdrawalAddressChanged")
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(emittedEvent.args.newWithdrawalAddress).to.be.equal(newAddress)
    }
    await setAndCheck(accounts[1])
    await setAndCheck(accounts[2])
    await setAndCheck(accounts[3])
    await setAndCheck(accounts[4])
    await setAndCheck(accounts[5])
  })

  it("should fail setting invalid withdrawal address or from non-owner's address.", async () => {
    let owner = await arbitration.owner()
    let setAndCheckState = async (newAddress, sender) => {
      await arbitration.setWithdrawalAddress(newAddress, {from: sender, gasPrice: 1}).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let address = await arbitration.getWithdrawalAddress()
        expect(address).to.be.not.equal(newAddress)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    await setAndCheckState("0x0", owner)
    await setAndCheckState("", owner)
    await setAndCheckState(accounts[7], accounts[8])
    await setAndCheckState(accounts[9], accounts[10])
    await setAndCheckState(accounts[6], accounts[11])
  })

  it("should set relay address from owner address", async () => {
    let owner = await arbitration.owner()
    await arbitration.setRelayContractAddress(accounts[1], {from: owner, gasPrice: 1})
    await arbitration.setRelayContractAddress(accounts[2], {from: owner, gasPrice: 1})
    await arbitration.setRelayContractAddress(accounts[3], {from: owner, gasPrice: 1})
    await arbitration.setRelayContractAddress(accounts[4], {from: owner, gasPrice: 1})
    await arbitration.setRelayContractAddress(accounts[5], {from: owner, gasPrice: 1})
  })

  it("should fail setting invalid relay address or from non-owner's address.", async () => {
    let owner = await arbitration.owner()
    let setAndCheckState = async (newAddress, sender) => {
      await arbitration.setRelayContractAddress(newAddress, {from: sender, gasPrice: 1}).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let address = await arbitration.relayContractAddress.call()
        expect(address).to.be.not.equal(newAddress)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    await setAndCheckState("0x0", owner)
    await setAndCheckState("", owner)
    await setAndCheckState(accounts[7], accounts[8])
    await setAndCheckState(accounts[9], accounts[10])
    await setAndCheckState(accounts[6], accounts[11])
  })

  it("should set time limit for accepting/rejecting proposal from contract owner's address.", async () => {
    let owner = await arbitration.owner()

    let setAndCheck = async (limit) => {
      let txn = await arbitration.setTimeLimitForReplyOnProposal(limit, {from: owner, gasPrice: 1})
      let savedLimit = await arbitration.getTimeLimitForReplyOnProposal()
      expect(savedLimit.toNumber()).to.be.equal(limit)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogProposalTimeLimitUpdated")
      expect(emittedEvent.args.proposalActionTimeLimit.toNumber()).to.be.equal(limit)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    }

    await setAndCheck(133)
    await setAndCheck(3)
    await setAndCheck(0)
    await setAndCheck(10000000299)
  })

  it("should fail setting time limit for accepting/rejecting proposal from not owner's address.", async () => {
    let owner = await arbitration.owner()

    let setAndCheck = async (limit, sender) => {
      await arbitration.setTimeLimitForReplyOnProposal(
        limit, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await setAndCheck(133, accounts[11])
    await setAndCheck(3, accounts[13])
    await setAndCheck(0, accounts[15])
    await setAndCheck(10000000299, accounts[18])
  })

  it("should correctly return dispute data with respective getter methods", async () => {
    await SetTimeLimit(0)
    let owner = await arbitration.owner()
    let startAndEndDipsute = async (respondent, respondentShare, initiator, initiatorShare) => {
      let hash = idHash
      await ConfigureTargetStub(
        true,
        [
          new Eligibility(true, respondent),
          new Eligibility(true, initiator)
        ]
      )
      let txn = await StartDispute(hash, respondent, respondentShare, initiator)
      await increaseTime(1)
      let startBlockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let initiatorStored = await arbitration.getDisputeInitiator(hash)
      let respondentStored = await arbitration.getDisputeRespondent(hash)
      let proposal = await arbitration.getDisputeProposalShare(hash)
      let initiatorProposalShare = await arbitration.getDisputeInitiatorShare(hash)
      let startStatus = await arbitration.getDisputeStartedStatus(hash)
      let startTime = await arbitration.getDisputeStartTime(hash)
      txn = await EndDispute(hash, respondentShare, initiatorShare, owner)
      let endBlockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let endTime = await arbitration.getDisputeSettlementTime(hash)
      let endStatus = await arbitration.getDisputeSettledStatus(hash)

      expect(initiatorStored).to.be.equal(initiator)
      expect(respondentStored).to.be.equal(respondent)
      expect(proposal.toNumber()).to.be.equal(respondentShare)
      expect(initiatorProposalShare.toNumber()).to.be.equal(initiatorShare)
      expect(startStatus).to.be.true
      expect(startTime.toNumber()).to.be.equal(startBlockInfo.timestamp)
      expect(endTime.toNumber()).to.be.equal(endBlockInfo.timestamp)
      expect(endStatus).to.be.true

      UpdateIdHash()
      await arbitrationTargetStub.resetState()
    }

    await startAndEndDipsute(accounts[10], 10, accounts[12], 90)
  })

  it("should set fees from contract's owner address", async () => {
    let owner = await arbitration.owner()

    let setFeeAndCheck = async (fixedFee, shareFee, sender) => {
      let txn = await arbitration.setFees(fixedFee, shareFee, {from: sender, gasPrice: 1})
      let fees = await arbitration.getFixedAndShareFees()
      expect(fees[0].toString()).to.be.equal(fixedFee)
      expect(fees[1].toNumber()).to.be.equal(shareFee)

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("LogFeesUpdated")
      expect(emittedEvent.args.fixedFee.toString()).to.be.equal(fixedFee)
      expect(emittedEvent.args.shareFee.toNumber()).to.be.equal(shareFee)
      expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    }

    await setFeeAndCheck(web3.toWei(1), 10, owner)
    await setFeeAndCheck(web3.toWei(0.2), 99, owner)
    await setFeeAndCheck(web3.toWei(0.002), 9, owner)
  })

  it("should fail setting fees from not contract's owner address", async () => {
    let owner = await arbitration.owner()

    let setFeeAndCheck = async (fixedFee, shareFee, sender) => {
      await arbitration.setFees(
        fixedFee, shareFee, {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await setFeeAndCheck(web3.toWei(9), 11, accounts[10])
    await setFeeAndCheck(web3.toWei(0.3), 89, accounts[11])
    await setFeeAndCheck(web3.toWei(0.004), 19, accounts[12])
  })
})

