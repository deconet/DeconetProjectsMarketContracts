var BigNumber = require("bignumber.js")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")
var DecoArbitrationTargetStub = artifacts.require("./DecoArbitrationTargetStub.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")

contract("DecoArbitration", async (accounts) => {
  let relay, arbitrationTargetStub, arbitration
  let id = 0
  let idHash = ''

  const ConfigureTargetStub = async (canStart, eligibility) => {
    await arbitrationTargetStub.setIfCanStartDispute(canStart)
    await arbitrationTargetStub.setEligibility(eligibility)
  }

  const StartDispute = async (idHash, proposalShares, sender) => {
    return arbitration.startDispute(idHash, proposalShares, {from: sender, gasPrice: 1})
  }

  const UpdateIdHash = () => {
    idHash = web3.sha3(`${id++}`)
  }

  before(async () => {
    arbitration = await DecoArbitration.deployed()
    arbitrationTargetStub = await DecoArbitrationTargetStub.new({ from: accounts[1], gasPrice: 1 })
    relay = await DecoRelay.deployed()
    relay.setMilestonesContractAddress(arbitrationTargetStub.address, {from: accounts[0], gasPrice: 1})
  })

  beforeEach(async () => {
    await arbitrationTargetStub.resetState()
    UpdateIdHash()
  })

  it("should start dispute correctly.", async () => {
    await ConfigureTargetStub(true, true)
    let startAndCheckState = async (shares, sender) => {
      let hash = idHash
      let txn = await StartDispute(hash, shares, sender)
      let isStarted = await arbitration.disputeStarted.call(hash)
      let disputeProposal = await arbitration.getDisputeProposal(hash)
      let disputeInitiator = await arbitration.disputeInitiator.call(hash)

      let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
      expect(isStartedInStub).to.be.true

      expect(isStarted).to.be.true
      expect(disputeProposal.map(x => x.toNumber())).to.have.members(shares)
      expect(disputeInitiator).to.be.equal(sender)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal('LogStartDispute')
      expect(emittedEvent.args.sender).to.be.equal(sender)
      expect(emittedEvent.args.idHash).to.be.equal(hash)
      expect(emittedEvent.args.sharesProposal.map(x => x.toNumber())).to.have.members(shares)

      UpdateIdHash()
    }

    await startAndCheckState([33, 67], accounts[3])
    await startAndCheckState([3, 97], accounts[4])
    await startAndCheckState([], accounts[5])
  })

  it("should fail starting dispute if a user is not eligible for that.", async () => {
    await ConfigureTargetStub(true, false)
    let startAndCheckState = async (shares, sender) => {
      let hash = idHash
      await StartDispute(hash, shares, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")

        let isStarted = await arbitration.disputeStarted.call(hash)
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

    await startAndCheckState([33, 67], accounts[3])
    await startAndCheckState([3, 97], accounts[4])
    await startAndCheckState([], accounts[5])
  })

  it("should fail starting dispute if there is already one active.", async () => {
    await ConfigureTargetStub(true, true)
    let startAndCheckState = async (shares, sender) => {
      let hash = idHash
      await StartDispute(hash, shares, sender)
      await StartDispute(hash, shares, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")
        let isStarted = await arbitration.disputeStarted.call(hash)
        let disputeProposal = await arbitration.getDisputeProposal(hash)
        let disputeInitiator = await arbitration.disputeInitiator.call(hash)

        expect(isStarted).to.be.true
        expect(disputeProposal.map(x => x.toNumber())).to.have.members(shares)
        expect(disputeInitiator).to.be.equal(sender)

        let isStartedInStub = await arbitrationTargetStub.disputeStarted.call()
        expect(isStartedInStub).to.be.true
      }).then(async (txn) => {
        if (txn) {
          assert.fail("Should have failed above.")
        }
      })

      UpdateIdHash()
    }

    await startAndCheckState([33, 67], accounts[3])
    await startAndCheckState([3, 97], accounts[4])
    await startAndCheckState([], accounts[5])
  })

  it("should fail starting dispute if target is not ready.", async () => {
    await ConfigureTargetStub(false, true)
    let startAndCheckState = async (shares, sender) => {
      let hash = idHash
      await StartDispute(hash, shares, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")

        let isStarted = await arbitration.disputeStarted.call(hash)
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

    await startAndCheckState([33, 67], accounts[3])
    await startAndCheckState([3, 97], accounts[4])
    await startAndCheckState([], accounts[5])
  })

  it("should fail starting dispute if provided shares array is invalid.", async () => {
    await ConfigureTargetStub(true, true)
    let startAndCheckState = async (shares, sender) => {
      let hash = idHash
      await StartDispute(hash, shares, sender).catch(async (err) => {
        assert.isOk(err, "Expected exception")

        let isStarted = await arbitration.disputeStarted.call(hash)
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

    // Sum of shares is not 100
    await startAndCheckState([33, 60], accounts[3])
    // There are more than 2 elements
    await startAndCheckState([33, 60, 7], accounts[4])
    await startAndCheckState([33, 60, 7, 10], accounts[5])
    // There is only one element.
    await startAndCheckState([7], accounts[6])
  })
})
