var web3NewUtils = require("web3-utils")
var BigNumber = require("bignumber.js")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestonesStub = artifacts.require("./DecoMilestonesStub.sol")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoProjectsMock = artifacts.require("./DecoProjectsMock.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")
var DecoArbitrationStub = artifacts.require("./DecoArbitrationStub.sol")
var DecoTest = artifacts.require("./DecoTest.sol")


class Project {
  constructor(contractStructArray) {
    this.agreementId = contractStructArray[0]
    this.client = contractStructArray[1]
    this.maker = contractStructArray[2]
    this.arbiter = contractStructArray[3]
    this.escrowContractAddress = contractStructArray[4]
    this.startDate = contractStructArray[5]
    this.endDate = contractStructArray[6]
    this.milestoneStartWindow = contractStructArray[7]
    this.feedbackWindow = contractStructArray[8]
    this.milestonesCount = contractStructArray[9]
    this.customerSatisfaction = contractStructArray[10]
    this.makerSatisfaction = contractStructArray[11]
    this.agreementsEncrypted = contractStructArray[12]
  }

  assertProjectWithParams(
    agreementId,
    client,
    maker,
    arbiter,
    escrowContractAddress,
    startDate,
    endDate,
    milestoneStartWindow,
    feedbackWindow,
    milestonesCount,
    customerSatisfaction,
    makerSatisfaction,
    agreementsEncrypted
  ) {
    assert.equal(this.agreementId, agreementId)
    assert.equal(this.client, client)
    assert.equal(this.maker, maker)
    assert.equal(this.arbiter, arbiter)
    assert.equal(this.escrowContractAddress, escrowContractAddress)
    expect(this.startDate.eq(startDate)).to.be.true
    expect(this.endDate.eq(endDate)).to.be.true
    expect(this.milestoneStartWindow.eq(milestoneStartWindow)).to.be.true
    expect(this.feedbackWindow.eq(feedbackWindow)).to.be.true
    expect(this.milestonesCount.eq(milestonesCount)).to.be.true
    expect(this.customerSatisfaction.eq(customerSatisfaction)).to.be.true
    expect(this.makerSatisfaction.eq(makerSatisfaction)).to.be.true
    assert.equal(this.agreementsEncrypted, agreementsEncrypted)
  }

  assertWithCreationParams(
    agreementId,
    client,
    maker,
    arbiter,
    milestoneStartWindow,
    feedbackWindow,
    milestonesCount,
    agreementsEncrypted
  ) {
    this.assertProjectWithParams(
      agreementId,
      client,
      maker,
      arbiter,
      this.escrowContractAddress,
      this.startDate,
      this.endDate,
      milestoneStartWindow,
      feedbackWindow,
      milestonesCount,
      this.customerSatisfaction,
      this.makerSatisfaction,
      agreementsEncrypted
    )
  }

  static createValidProjectInstance(accounts, agreementId, arbiter) {
    return new Project(
      [
        agreementId === undefined ? "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM" : `QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM${agreementId}`,
        accounts[0],
        accounts[1],
        arbiter,
        accounts[29],
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(Math.round(new Date().getTime() / 1000) + 30 * 24 * 60 * 60),
        new BigNumber("10"),
        new BigNumber("11"),
        new BigNumber("12"),
        new BigNumber("0"),
        new BigNumber("0"),
        false
      ]
    )
  }
}

contract("DecoProjects", async (accounts) => {
  let projectId = 0
  let decoProjects = undefined
  let decoRelay = undefined
  let decoEscrowFactory = undefined
  let decoMilestonesStub = undefined
  let decoArbitration = undefined
  let testAgreementHash = ""
  let signatureHash = undefined
  let mock = undefined
  let signature = undefined

  let notExistingAgreementId = "NOT EXISTING AGREEMENT ID"

  const DeployMilestonesContractStub = async (ownerAddress) => {
    decoMilestonesStub = await DecoMilestonesStub.new({from: ownerAddress, gasPrice: 1})
    if(decoRelay) {
      await decoRelay.setMilestonesContractAddress(
        decoMilestonesStub.address,
        {from: accounts[0], gasPrice: 1}
      )
      await decoMilestonesStub.setRelayContractAddress(
        decoRelay.address,
        {from: mock.client, gasPrice: 1}
      )
    }
    return decoMilestonesStub
  }

  const StartProject = async (sign, sender) => {
    return await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      sign,
      mock.milestonesCount.toNumber(),
      mock.milestoneStartWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: sender, gasPrice: 1 }
    )
  }

  const RefreshSignatureAndHashes = async () => {
    testAgreementHash = web3.sha3(mock.agreementId)
    signatureHash = web3NewUtils.soliditySha3(mock.agreementId, mock.arbiter)
    signature = web3.eth.sign(mock.maker, signatureHash)
  }

  const GenerateNewAgreementId = async () => {
    mock.agreementId = `test${projectId++}`
  }

  beforeEach(async () => {
    decoProjects = await DecoProjects.deployed()
    decoRelay = await DecoRelay.deployed()
    decoEscrowFactory = await DecoEscrowFactory.deployed()
    decoArbitration = await DecoArbitration.deployed()
    await decoRelay.setEscrowFactoryContractAddress(
      decoEscrowFactory.address,
      {from: accounts[0], gasPrice: 1}
    )
    await decoProjects.setRelayContractAddress(
      decoRelay.address,
      {from: accounts[0], gasPrice: 1}
    )
    mock = Project.createValidProjectInstance(
      accounts,
      `${projectId++}`,
      decoArbitration.address
    )
    await DeployMilestonesContractStub(mock.client)
    RefreshSignatureAndHashes()
  })

  it("should start the project with maker address and matching signature.", async () => {
    let listener = decoEscrowFactory.EscrowCreated()
    let txn = await StartProject(signature, mock.client)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    let events = await listener.get()
    let escrowCreatedEvent = events[events.length - 1]
    expect(escrowCreatedEvent.event).to.be.equal("EscrowCreated")
    expect((new BigNumber(escrowCreatedEvent.args.newEscrowAddress)).toNumber()).to.not.be.equal(0)

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    project.assertWithCreationParams(
      mock.agreementId,
      mock.client,
      mock.maker,
      mock.arbiter,
      mock.milestoneStartWindow,
      mock.feedbackWindow,
      mock.milestonesCount,
      mock.agreementsEncrypted
    )
    expect(project.escrowContractAddress).to.be.equal(escrowCreatedEvent.args.newEscrowAddress)
  })

  it("should fail project creation if makers signature isn't valid.", async () => {
    signature = web3.eth.sign(mock.client, signatureHash)

    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for the transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail project creation if msg.sender is different from 'client' account.", async () => {
    await StartProject(signature, accounts[3]).catch((err) => {
      assert.isOk(err, "Exception should be thrown for the transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should fail project creation if project's client is a maker or arbiter is a client or a maker.",
    async () => {
      let arbiter = mock.arbiter
      let client = mock.client
      let maker = mock.maker
      mock.maker = client
      RefreshSignatureAndHashes()
      await StartProject(signature, mock.client).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        mock.maker = maker
        RefreshSignatureAndHashes()
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      mock.arbiter = client
      await StartProject(signature, mock.client).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        mock.arbiter = arbiter
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      mock.arbiter = maker
      await StartProject(signature, mock.client).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })

  it("should validate milestones count to be within the range 1-24.", async () => {
    await StartProject(signature, mock.client)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let project = new Project(projectArray)
    expect(project.milestonesCount.eq(mock.milestonesCount)).to.be.true

    mock.milestonesCount = new BigNumber("0")
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    
    mock.milestonesCount = new BigNumber("25")
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should set start date to be equal to the last block timestamp.", async () => {
    let txn = await StartProject(signature, mock.client)
    let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let project = new Project(projectArray)
    let blockTimestamp = new BigNumber(blockNumInfo.timestamp)
    expect(project.startDate.eq(blockTimestamp)).to.be.true
  })

  it("should fail to start a project with an existing agreement hash", async () => {
    await StartProject(signature, mock.client)
    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should add new project to the lists of client`s and maker`s projects.", async () => {
    await StartProject(signature, mock.client)
    let clientProjects = await decoProjects.getClientProjects.call(mock.client)
    let makerProjects = await decoProjects.getMakerProjects.call(mock.maker)

    expect(clientProjects).to.include(testAgreementHash)
    expect(makerProjects).to.include(testAgreementHash)
  })

  it("should correctly return maker's and client's projects", async () => {
    let makersProjectsBefore = await decoProjects.getMakerProjects(mock.maker)
    let clientsProjectsBefore = await decoProjects.getClientProjects(mock.client)

    
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    let testAgreementHash1 = testAgreementHash
    let signature1 = signature
    await StartProject(signature1, mock.client)

    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    let testAgreementHash2 = testAgreementHash
    let signature2 = signature
    await StartProject(signature2, mock.client)

    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    let testAgreementHash3 = testAgreementHash
    let signature3 = signature
    await StartProject(signature3, mock.client)

    let makersProjects = await decoProjects.getMakerProjects.call(mock.maker)
    let clientsProjects = await decoProjects.getClientProjects.call(mock.client)

    expect(makersProjects).to.have.length(makersProjectsBefore.length + 3)
    expect(clientsProjects).to.have.length(clientsProjectsBefore.length + 3)

    expect(makersProjects).to.include.members(
      [testAgreementHash1, testAgreementHash2, testAgreementHash3]
    )

    expect(clientsProjects).to.include.members(
      [testAgreementHash1, testAgreementHash2, testAgreementHash3]
    )
  })

  it("should emit the event upon creation of a new project.", async () => {
    let txn = await StartProject(signature, mock.client)
    let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    let emittedEvent = txn.logs[txn.logs.length - 1]
    expect(emittedEvent.event).to.be.equal("ProjectStateUpdate")
    expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
    expect(emittedEvent.args.updatedBy).to.be.equal(mock.client)
    expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockNumInfo.timestamp)
    expect(emittedEvent.args.state.toNumber()).to.be.equal(0)
  })

  it("shouldn't emit the event when creation of a new project fails.", async () => {
    // A signature below is created by not a maker, should cause an exception in contract.
    signature = web3.eth.sign(accounts[4], signatureHash)
    await StartProject(signature, mock.client).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.be.empty
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should let project's client to terminate the project if the last milestone state is valid.",
    async () => {
      await StartProject(signature, mock.client)
      await decoMilestonesStub.setIfClientCanTerminate(true)

      let txn = await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it(
    "shouldn't let project's client to terminate the project if the last milestone state isn't valid.",
    async () => {
      await StartProject(signature, mock.client)

      await decoMilestonesStub.setIfClientCanTerminate(false)

      await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for that transaction.")
        let projectArray = await decoProjects.projects.call(testAgreementHash)
        expect(projectArray[0]).to.not.be.empty
        let project = new Project(projectArray)
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })


  it(
    "should let project's maker to terminate the project if the last milestone state is valid.",
    async () => {
      await StartProject(signature, mock.client)

      await decoMilestonesStub.setIfMakerCanTerminate(true)

      let txn = await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.maker, gasPrice: 1 }
      )

      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it(
    "shouldn't let project's maker to terminate the project if the last milestone state isn't valid.",
    async () => {
      await StartProject(signature, mock.client)

      await decoMilestonesStub.setIfMakerCanTerminate(false)

      await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.maker, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for that transaction.")
        let projectArray = await decoProjects.projects.call(testAgreementHash)
        expect(projectArray[0]).to.not.be.empty
        let project = new Project(projectArray)
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })

  it("should terminate a projec if sent from milestones contract.", async () => {
    await StartProject(signature, mock.client)

    let txn = await decoMilestonesStub.terminateProjectAsDisputeResult(
      testAgreementHash,
      {from: mock.client, gasPrice: 1}
    )

    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let project = new Project(projectArray)
    expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it("should fail to terminate if sender is neither a client nor a maker nor a milestons contract.", async () => {
    await StartProject(signature, mock.client)

    await decoMilestonesStub.setIfMakerCanTerminate(true)
    await decoMilestonesStub.setIfClientCanTerminate(true)

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: accounts[4], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should emit event upon termination of a project.", async () => {
    await StartProject(signature, mock.client)

    await decoMilestonesStub.setIfMakerCanTerminate(true)
    await decoMilestonesStub.setIfClientCanTerminate(true)

    let txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    )

    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    expect(txn.logs[0].event).to.be.equal("ProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.maker)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(2)

    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)

    txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )

    blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    expect(txn.logs[0].event).to.be.equal("ProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(2)

    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    let observer = decoProjects.ProjectStateUpdate()
    txn = await decoMilestonesStub.terminateProjectAsDisputeResult(
      testAgreementHash,
      {from: mock.client, gasPrice: 1}
    )

    let logs = await observer.get()
    blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(logs).to.have.lengthOf.at.least(1)
    expect(logs[0].event).to.be.equal("ProjectStateUpdate")
    expect(logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(logs[0].args.updatedBy).to.be.equal(decoMilestonesStub.address)
    expect(logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    expect(logs[0].args.state.toNumber()).to.be.equal(2)

  })

  it("shouldn't emit the event when termination of a project fails.", async () => {
    await StartProject(signature, mock.client)

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: accounts[3], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail termination if there is no such project.", async () => {
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.empty

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.be.empty
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await decoMilestonesStub.terminateProjectAsDisputeResult(
      testAgreementHash,
      {from: mock.client, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.be.empty
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

  })

  it("should fail to terminate already completed or terminated project.", async () => {
    await StartProject(signature, mock.client)

    let txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should let the client to complete the project upon acceptance of the last milestone.",
    async () => {
      await decoMilestonesStub.setLastMilestoneNumber(
        mock.milestonesCount.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await decoMilestonesStub.setIsLastMilestoneAccepted(
        true,
        { from: mock.client, gasPrice: 1 }
      )
      await decoMilestonesStub.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      let txn = await decoMilestonesStub.acceptLastMilestone(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      )
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)

      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it(
    "should fail completion of the project if there is no such project.",
    async () => {
      await decoMilestonesStub.setLastMilestoneNumber(
        mock.milestonesCount.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await decoMilestonesStub.setIsLastMilestoneAccepted(
        true,
        { from: mock.client, gasPrice: 1 }
      )
      await decoMilestonesStub.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      let txn = await decoMilestonesStub.acceptLastMilestone(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        let projectArray = await decoProjects.projects.call(testAgreementHash)
        expect(projectArray[0]).to.be.empty
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })

  it("shouldn't allow anybody else beside the client to complete the project", async () => {
    await decoMilestonesStub.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    let checkCondition = async (sender) => {
      await decoMilestonesStub.acceptLastMilestone(
        testAgreementHash,
        { from: sender, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for that transaction.")
        let projectArray = await decoProjects.projects.call(testAgreementHash)
        let project = new Project(projectArray)
        expect(project.endDate.toNumber()).to.be.equal(0)
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    await checkCondition(mock.maker)
    await checkCondition(mock.arbiter)
    await checkCondition(accounts[5])
  })

  it("should fail to complete if it is called not from the milestones contract", async () => {
    await decoMilestonesStub.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    await decoProjects.completeProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should fail to complete if the last completed milestone is not the last project milestone",
    async () => {
      await decoMilestonesStub.setLastMilestoneNumber(
        mock.milestonesCount.toNumber() - 1,
        { from: mock.client, gasPrice: 1 }
      )
      await decoMilestonesStub.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      await decoMilestonesStub.acceptLastMilestone(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for that transaction.")
        let projectArray = await decoProjects.projects.call(testAgreementHash)
        let project = new Project(projectArray)
        expect(project.endDate.toNumber()).to.be.equal(0)
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })

  it("should fail to complete if the last milestone is not accepted.", async () => {
    await decoMilestonesStub.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setIsLastMilestoneAccepted(
      false,
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    await decoMilestonesStub.acceptLastMilestone(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail to complete the project if it is already completed or terminated.", async () => {
    await decoMilestonesStub.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await decoMilestonesStub.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    let txn = await decoMilestonesStub.acceptLastMilestone(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    await decoMilestonesStub.acceptLastMilestone(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should allow client and maker to rate each other on a completed project, and not allow that for anyboady else.", async () => {
    await StartProject(signature, mock.client)

    await decoMilestonesStub.setIfMakerCanTerminate(true)

    let txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    )

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.client, gasPrice: 1}
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      5,
      { from: mock.maker, gasPrice: 1}
    )
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.not.empty
    let project = new Project(projectArray) 
    expect(project.makerSatisfaction.toNumber()).to.be.equal(5)
    expect(project.customerSatisfaction.toNumber()).to.be.equal(3)

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      4,
      { from: mock.arbiter, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail giving a score to another party if a project is not completed.", async () => {
    await StartProject(signature, mock.client)

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.client, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      5,
      { from: mock.maker, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.not.empty
    let project = new Project(projectArray) 
    expect(project.makerSatisfaction.toNumber()).to.be.equal(0)
    expect(project.customerSatisfaction.toNumber()).to.be.equal(0)
  })

  it("should fail giving a score to another party if a project doesn't exist.", async () => {
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.client, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      5,
      { from: mock.maker, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.empty
  })

  it("should fail giving a score to another party if raiting is out of the range from 1 to 10.", async () => {
    await StartProject(signature, mock.client)
    await decoMilestonesStub.setIfMakerCanTerminate(true)

    let txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    )

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      0,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      11,
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.not.empty
    let project = new Project(projectArray) 
    expect(project.makerSatisfaction.toNumber()).to.be.equal(0)
    expect(project.customerSatisfaction.toNumber()).to.be.equal(0)
  })

  it("should fail giving a score to another party if raiting is already set", async () => {
    await StartProject(signature, mock.client)
    await decoMilestonesStub.setIfMakerCanTerminate(true)

    let txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    )

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      1,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      10,
      { from: mock.maker, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      9,
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.be.not.empty
    let project = new Project(projectArray) 
    expect(project.makerSatisfaction.toNumber()).to.be.equal(10)
    expect(project.customerSatisfaction.toNumber()).to.be.equal(1)
  })

  it("should emit the event upon rating is set", async () => {
    await StartProject(signature, mock.client)
    await decoMilestonesStub.setIfMakerCanTerminate(true)

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    )

    let rating = 1
    let txn = await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      rating,
      { from: mock.client, gasPrice: 1 }
    )
    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.length(1)
    expect(txn.logs[0].event).to.be.equal("ProjectRated")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.ratedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.rating.toNumber()).to.be.equal(rating)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it("should fail emitting the event if setting a score fails.", async () => {
    await StartProject(signature, mock.client)
    await decoMilestonesStub.setIfMakerCanTerminate(true)

    let rating = 1
    let txn = await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      rating,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      expect(err.receipt.logs).to.have.length(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail setting a score if there is no such project.", async () => {
    let rating = 1
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      rating,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.be.empty
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      rating,
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.be.empty
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should calculate correctly average MSAT for the client", async () => {
    const validateScoreCalculations = async (expectedRating) => {
      let actualRating
      let endedProjectsCount
      [actualRating, endedProjectsCount] = await decoProjects.clientsAverageRating(mock.client)
      actualRating = actualRating.dividedBy(endedProjectsCount)
      expect(actualRating.toNumber()).to.be.equal(expectedRating)
    }

    // First completed and rated project
    mock.client = accounts[5]
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      1,
      { from: mock.maker, gasPrice: 1}
    )
    await validateScoreCalculations(1)

    // Second completed and rated project
    
    mock.maker = accounts[6]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      2,
      { from: mock.maker, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2) / 2)

    // Third completed and rated project
    mock.maker = accounts[7]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.maker, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2 + 3) / 3)

    // Fourth completed and rated project
    mock.maker = accounts[8]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      4,
      { from: mock.maker, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Fifth completed but not rated project
    mock.maker = accounts[9]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.maker = accounts[10]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)

    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)
  })

  it("should calculate correctly average CSAT for the maker", async () => {
    const validateScoreCalculations = async (expectedRating) => {
      let actualRating
      let endedProjectsCount
      [actualRating, endedProjectsCount] = await decoProjects.makersAverageRating(mock.maker)
      actualRating = actualRating.dividedBy(endedProjectsCount)
      expect(actualRating.toNumber()).to.be.equal(expectedRating)
    }

    // First completed and rated project
    mock.maker = accounts[5]
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      1,
      { from: mock.client, gasPrice: 1}
    )
    await validateScoreCalculations(1)

    // Second completed and rated project
    mock.client = accounts[6]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      2,
      { from: mock.client, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2) / 2)

    // Third completed and rated project
    mock.client = accounts[7]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      3,
      { from: mock.client, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2 + 3) / 3)

    // Fourth completed and rated project
    mock.client = accounts[8]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await decoProjects.rateProjectSecondParty(
      testAgreementHash,
      4,
      { from: mock.client, gasPrice: 1}
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Fifth completed but not rated project
    mock.client = accounts[9]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.client = accounts[10]
    GenerateNewAgreementId()
    RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)
  })

  it("should correctly return project existence status.", async () => {
    let projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.false
    await StartProject(signature, mock.client)
    projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.true
    testAgreementHash = web3.sha3(notExistingAgreementId)
    projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.false
  })

  it("should correctly get milestones count out of the existing project instance.", async () => {
    let milestonesCount = await decoProjects.getProjectMilestonesCount(testAgreementHash)
    expect(milestonesCount.toNumber()).to.be.equal(0)
    await StartProject(signature, mock.client)
    milestonesCount = await decoProjects.getProjectMilestonesCount(testAgreementHash)
    expect(milestonesCount.toNumber()).to.be.equal(mock.milestonesCount.toNumber())
    testAgreementHash = web3.sha3(notExistingAgreementId)
    milestonesCount = await decoProjects.getProjectMilestonesCount(testAgreementHash)
    expect(milestonesCount.toNumber()).to.be.equal(0)
  })

  it("should correctly deploy escrow clone if there is valid factory contract.", async () => {
    let decoProjectsMockOwner = accounts[4]
    let decoProjectsMock = await DecoProjectsMock.new({from: decoProjectsMockOwner, gasPrice: 1})
    await decoProjectsMock.setRelayContractAddress(
      decoRelay.address,
      {from: decoProjectsMockOwner, gasPrice:1}
    )

    let txn = await decoProjectsMock.testDeployEscrowClone(
      decoProjectsMockOwner,
      {from: decoProjectsMockOwner, gasPrice: 1}
    )

    let emittedEvent = txn.logs[txn.logs.length - 1]
    expect(emittedEvent.args.newCloneAddress).to.be.not.empty

    let decoEscrow = await DecoEscrow.at(emittedEvent.args.newCloneAddress)
    let ownerOfEscrow = await decoEscrow.owner.call()
    let authorizedAddress = await decoEscrow.authorizedAddress.call()

    expect(ownerOfEscrow).to.be.equal(decoProjectsMockOwner)
    expect(authorizedAddress).to.be.equal(decoMilestonesStub.address)
  })

  it("should fail deploying escrow clone if there is invalid factory contract address.", async () => {
    let decoProjectsMockOwner = accounts[4]
    let decoProjectsMock = await DecoProjectsMock.new({from: decoProjectsMockOwner, gasPrice: 1})

    await decoProjectsMock.testDeployEscrowClone(
      decoProjectsMockOwner,
      {from: decoProjectsMockOwner, gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Expected exception.")
      expect(err.receipt.logs).to.be.empty
    }).then(async (txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should return true for valid maker address, signature, arbiter address, and agreementId", 
    async () => {
      let decoProjectsMockOwner = accounts[4]
      let decoProjectsMock = await DecoProjectsMock.new({from: decoProjectsMockOwner, gasPrice: 1})

      GenerateNewAgreementId()
      RefreshSignatureAndHashes()
      let result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker, 
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.true

      GenerateNewAgreementId()
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker, 
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false

      RefreshSignatureAndHashes()
      mock.maker = accounts[10]
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker, 
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false

      RefreshSignatureAndHashes()
      signatureHash = web3NewUtils.soliditySha3(mock.agreementId, accounts[12])
      signature = web3.eth.sign(mock.maker, signatureHash)
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker, 
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false

      RefreshSignatureAndHashes()
      signatureHash = web3NewUtils.soliditySha3(mock.agreementId, mock.arbiter)
      signature = web3.eth.sign(accounts[0], signatureHash)
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker, 
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false
  })

  it("should pull and store fees for a newly created project.", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    mock.arbiter = arbitrationStub.address
    RefreshSignatureAndHashes()

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee) => {
      let fixedFee = web3.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      await StartProject(signature, mock.client)

      let actualFixedFee = await decoProjects.projectArbiterFixedFee.call(testAgreementHash)
      let actualShareFee = await decoProjects.projectArbiterShareFee.call(testAgreementHash)

      expect(actualFixedFee.toString()).to.be.equal(fixedFee)
      expect(actualShareFee.toNumber()).to.be.equal(shareFee)

      GenerateNewAgreementId()
      RefreshSignatureAndHashes()
    }

    await startProjectAndCheckFees(1, 90)
    await startProjectAndCheckFees(4, 80)
    await startProjectAndCheckFees(0.0001, 80)
    await startProjectAndCheckFees(0.000001, 1)
  })

  it("should fail storing fees and fail project start if arbiter contract is invalid.", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee, arbiter) => {
      let fixedFee = web3.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      mock.arbiter = arbiter
      await StartProject(signature, mock.client).catch(async (err) => {
        assert.isOk(err, "Expected exception.")

        let actualFixedFee = await decoProjects.projectArbiterFixedFee.call(testAgreementHash)
        let actualShareFee = await decoProjects.projectArbiterShareFee.call(testAgreementHash)

        expect(actualFixedFee.toNumber()).to.be.equal(0)
        expect(actualShareFee.toNumber()).to.be.equal(0)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await startProjectAndCheckFees(1, 90, accounts[9])
    await startProjectAndCheckFees(4, 80, accounts[10])
    await startProjectAndCheckFees(0.0001, 80, accounts[8])
    await startProjectAndCheckFees(0.000001, 1, accounts[5])
  })

  it("should return fees for the given project", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    mock.arbiter = arbitrationStub.address
    RefreshSignatureAndHashes()

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee) => {
      let fixedFee = web3.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      await StartProject(signature, mock.client)

      let fees = await decoProjects.getProjectArbitrationFees(testAgreementHash)

      expect(fees[0].toString()).to.be.equal(fixedFee)
      expect(fees[1].toNumber()).to.be.equal(shareFee)

      GenerateNewAgreementId()
      RefreshSignatureAndHashes()
    }

    await startProjectAndCheckFees(1, 90)
    await startProjectAndCheckFees(4, 80)
    await startProjectAndCheckFees(0.0001, 80)
    await startProjectAndCheckFees(0.000001, 1)


    let fees = await decoProjects.getProjectArbitrationFees(testAgreementHash)
    expect(fees[0].toNumber()).to.be.equal(0)
    expect(fees[1].toNumber()).to.be.equal(0)
  })

  it("should correctly validate project for dispute and return required information.", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    let decoTest = await DecoTest.new({from: accounts[0], gasPrice: 1})

    mock.arbiter = arbitrationStub.address
    RefreshSignatureAndHashes()
    let fixedFee = web3.toWei(1)
    let shareFee = 5 // %
    await arbitrationStub.setStubFees(fixedFee, shareFee)

    let checkFail = async (respondent, initiator, arbiter) => {
      await decoTest.testGetInfoAndValidateForDispute(
        testAgreementHash,
        respondent,
        initiator,
        arbiter,
        fixedFee,
        shareFee,
        "0x0",
        decoProjects.address
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    let checkSuccess = async (respondent, initiator, arbiter) => {
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.undefined
      let project = new Project(projectArray)
      await decoTest.testGetInfoAndValidateForDispute(
        testAgreementHash,
        respondent,
        initiator,
        arbiter,
        fixedFee,
        shareFee,
        project.escrowContractAddress,
        decoProjects.address
      )
    }

    await checkFail(accounts[3], accounts[4], accounts[5])
    await checkFail(mock.maker, mock.client, mock.arbiter)

    await StartProject(signature, mock.client)

    await checkFail(accounts[3], accounts[4], accounts[5])
    await checkFail(mock.client, accounts[4], accounts[5])
    await checkFail(accounts[3], mock.client, accounts[5])
    await checkFail(mock.maker, accounts[4], accounts[5])
    await checkFail(accounts[3], mock.maker, accounts[5])
    await checkFail(accounts[3], accounts[4], mock.arbiter)
    await checkFail(mock.client, accounts[4], mock.arbiter)
    await checkFail(accounts[3], mock.maker, mock.arbiter)

    await checkSuccess(mock.client, mock.maker, mock.arbiter)
    await checkSuccess(mock.maker, mock.client, mock.arbiter)
  })

  it("should return correct project information.", async () => {
    let check = async (
      projectExist,
      escrow,
      client,
      maker,
      arbiter,
      feedbackWindow,
      milestoneStartWindow,
      startDate,
      endDate,
      milestonesCount
    ) => {
      let value = await decoProjects.checkIfProjectExists(testAgreementHash)
      expect(value).to.be.equal(projectExist)
      value = await decoProjects.getProjectEscrowAddress(testAgreementHash)
      expect(new BigNumber(value).toNumber()).to.be.equal(new BigNumber(escrow).toNumber())
      value = await decoProjects.getProjectClient(testAgreementHash)
      expect(new BigNumber(value).toNumber()).to.be.equal(new BigNumber(client).toNumber())
      value = await decoProjects.getProjectMaker(testAgreementHash)
      expect(new BigNumber(value).toNumber()).to.be.equal(new BigNumber(maker).toNumber())
      value = await decoProjects.getProjectArbiter(testAgreementHash)
      expect(new BigNumber(value).toNumber()).to.be.equal(new BigNumber(arbiter).toNumber())
      value = await decoProjects.getProjectFeedbackWindow(testAgreementHash)
      expect(value.toNumber()).to.be.equal(feedbackWindow)
      value = await decoProjects.getProjectMilestoneStartWindow(testAgreementHash)
      expect(value.toNumber()).to.be.equal(milestoneStartWindow)
      value = await decoProjects.getProjectStartDate(testAgreementHash)
      expect(value.toNumber()).to.be.equal(startDate)
      value = await decoProjects.getProjectEndDate(testAgreementHash)
      expect(value.toNumber()).to.be.equal(endDate)
      value = await decoProjects.getProjectMilestonesCount(testAgreementHash)
      expect(value.toNumber()).to.be.equal(milestonesCount)
    }
    await check(false, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    await StartProject(signature, mock.client)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    await check(
      true,
      project.escrowContractAddress,
      project.client,
      project.maker,
      project.arbiter,
      project.feedbackWindow.toNumber(),
      project.milestoneStartWindow.toNumber(),
      project.startDate.toNumber(),
      project.endDate.toNumber(),
      project.milestonesCount.toNumber())
  })
})
