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
  })

  beforeEach(async () => {
    arbitrationTargetStub = await DecoArbitrationTargetStub.new({ from: accounts[1], gasPrice: 1 })
    relay.setMilestonesContractAddress(arbitrationTargetStub.address, {from: accounts[0], gasPrice: 1})
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
      let disputeProposal = await arbitration.getDisputeProposal(hash)
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
        let disputeProposal = await arbitration.getDisputeProposal(hash)
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
      let disputeProposal = await arbitration.getDisputeProposal(hash)
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
      await StartDisputeInStub(hash, respondent, -1, initiator)
      let txn
      if(isInternal) {
        txn = await EndDisputeInStubInternally(hash, respondentShare, initiatorShare, arbiter)
      } else {
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
    await startAndCheckState(accounts[12], 100, accounts[13], 0, accounts[14], true)
    await startAndCheckState(accounts[15], 0, accounts[16], 100, arbitrationContractOwner, false)
    await startAndCheckState(accounts[17], 100, accounts[18], 0, arbitrationContractOwner, false)
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
    await startAndCheckState(accounts[5], 72, accounts[6], 28, arbitrationContractOwner)
    await startAndCheckState(accounts[8], 47, accounts[9], 53, arbitrationContractOwner)
    await startAndCheckState(accounts[9], 0, accounts[10], 100, arbitrationContractOwner)
    await arbitration.setTimeLimitForReplyOnProposal(10000000)
    await startAndCheckState(accounts[11], 0, accounts[12], 0, arbitrationContractOwner, true)
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
})

