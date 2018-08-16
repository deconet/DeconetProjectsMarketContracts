var BigNumber = require("bignumber.js")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestonesMock = artifacts.require("./DecoMilestonesMock.sol")

const DeployMilestonesContractMock = async (ownerAddress) => {
  return DecoMilestonesMock.new({from: ownerAddress, gasPrice: 1})
}

class Project {
  constructor(contractStructArray) {
    this.agreementId = contractStructArray[0]
    this.client = contractStructArray[1]
    this.maker = contractStructArray[2]
    this.arbiter = contractStructArray[3]
    this.startDate = contractStructArray[4]
    this.endDate = contractStructArray[5]
    this.paymentWindow = contractStructArray[6]
    this.feedbackWindow = contractStructArray[7]
    this.milestonesCount = contractStructArray[8]
    this.customerSatisfaction = contractStructArray[9]
    this.makerSatisfaction = contractStructArray[10]
    this.agreementsEncrypted = contractStructArray[11]
  }

  assertProjectWithParams(
    agreementId,
    client,
    maker,
    arbiter,
    startDate,
    endDate,
    paymentWindow,
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
    expect(this.startDate.eq(startDate)).to.be.true
    expect(this.endDate.eq(endDate)).to.be.true
    expect(this.paymentWindow.eq(paymentWindow)).to.be.true
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
    paymentWindow,
    feedbackWindow,
    milestonesCount,
    agreementsEncrypted
  ) {
    this.assertProjectWithParams(
      agreementId,
      client,
      maker,
      arbiter,
      this.startDate,
      this.endDate,
      paymentWindow,
      feedbackWindow,
      milestonesCount,
      this.customerSatisfaction,
      this.makerSatisfaction,
      agreementsEncrypted
    )
  }

  static createValidProjectInstance(accounts, agreementId) {
    return new Project(
      [
        agreementId === undefined ? "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM" : `QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM${agreementId}`,
        accounts[0],
        accounts[1],
        accounts[2],
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
  let testAgreementHash = ""
  let mock = undefined
  let signature = undefined

  let notExistingAgreementId = "NOT EXISTING AGREEMENT ID"

  const StartProject = async (signature, sender) => {
    return await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: sender, gasPrice: 1 }
    )
  }

  beforeEach(async () => {
    decoProjects = await DecoProjects.deployed()
    mock = Project.createValidProjectInstance(
      accounts,
      `${projectId++}`
    )
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
  })

  it("should start the project with maker address and matching signature.", async () => {
    await StartProject(signature, mock.client)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    project.assertWithCreationParams(
      mock.agreementId,
      mock.client,
      mock.maker,
      mock.arbiter,
      mock.paymentWindow,
      mock.feedbackWindow,
      mock.milestonesCount,
      mock.agreementsEncrypted
    )
  })

  it("should fail project creation if makers signature isn't valid.", async () => {
    signature = web3.eth.sign(mock.client, testAgreementHash)

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
      signature = web3.eth.sign(mock.maker, testAgreementHash)
      await StartProject(signature, mock.client).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        mock.maker = maker
        signature = web3.eth.sign(mock.maker, testAgreementHash)
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

    mock.agreementId = `${projectId++}`
    mock.milestonesCount = new BigNumber("0")
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    mock.agreementId = `${projectId++}`
    mock.milestonesCount = new BigNumber("25")
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    let makersProjectsBefore = await decoProjects.getMakerProjects.call(mock.maker)
    let clientsProjectsBefore = await decoProjects.getClientProjects.call(mock.client)

    let testAgreementHash1= web3.sha3(mock.agreementId)
    let signature1 = web3.eth.sign(mock.maker, testAgreementHash1)
    await StartProject(signature1, mock.client)

    mock.agreementId = `${projectId++}`
    let testAgreementHash2 = web3.sha3(mock.agreementId)
    let signature2 = web3.eth.sign(mock.maker, testAgreementHash2)
    await StartProject(signature2, mock.client)

    mock.agreementId = `${projectId++}`
    let testAgreementHash3 = web3.sha3(mock.agreementId)
    let signature3 = web3.eth.sign(mock.maker, testAgreementHash3)
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
    expect(txn.logs).to.have.length(1)
    expect(txn.logs[0].event).to.be.equal("ProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockNumInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(0)
  })

  it("shouldn't emit the event when creation of a new project fails.", async () => {
    // A signature below is created by not a maker, should cause an exception in contract.
    signature = web3.eth.sign(accounts[4], testAgreementHash)
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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await StartProject(signature, mock.client)
      await milestonesContractMock.setIfClientCanTerminate(true)

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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await StartProject(signature, mock.client)

      await milestonesContractMock.setIfClientCanTerminate(false)

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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await StartProject(signature, mock.client)

      await milestonesContractMock.setIfMakerCanTerminate(true)

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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await StartProject(signature, mock.client)

      await milestonesContractMock.setIfMakerCanTerminate(false)

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

  it("should fail to terminate if sender is not a client nor a maker.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)

    await milestonesContractMock.setIfMakerCanTerminate(true)
    await milestonesContractMock.setIfClientCanTerminate(true)

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

  it("should emit event when either client or maker terminates a project.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)

    await milestonesContractMock.setIfMakerCanTerminate(true)
    await milestonesContractMock.setIfClientCanTerminate(true)

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

    mock.agreementId = `${projectId++}`
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )

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
  })

  it("should fail to terminate already completed or terminated project.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )

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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setLastMilestoneNumber(
        mock.milestonesCount.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setIsLastMilestoneAccepted(
        true,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      let txn = await milestonesContractMock.acceptLastMilestone(
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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setLastMilestoneNumber(
        mock.milestonesCount.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setIsLastMilestoneAccepted(
        true,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      let txn = await milestonesContractMock.acceptLastMilestone(
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    let checkCondition = async (sender) => {
      await milestonesContractMock.acceptLastMilestone(
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectOwnerAddress(
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
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setLastMilestoneNumber(
        mock.milestonesCount.toNumber() - 1,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectOwnerAddress(
        mock.client,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      await milestonesContractMock.acceptLastMilestone(
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setIsLastMilestoneAccepted(
      false,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    await milestonesContractMock.acceptLastMilestone(
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setLastMilestoneNumber(
      mock.milestonesCount.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setIsLastMilestoneAccepted(
      true,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectOwnerAddress(
      mock.client,
      { from: mock.client, gasPrice: 1 }
    )

    await StartProject(signature, mock.client)

    let txn = await milestonesContractMock.acceptLastMilestone(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    await milestonesContractMock.acceptLastMilestone(
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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)

    await milestonesContractMock.setIfMakerCanTerminate(true)

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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

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

  it("should fail giving a score to another party if raiting is out of the range from 1 to 10.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)
    await milestonesContractMock.setIfMakerCanTerminate(true)

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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)
    await milestonesContractMock.setIfMakerCanTerminate(true)

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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)
    await milestonesContractMock.setIfMakerCanTerminate(true)

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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await StartProject(signature, mock.client)
    await milestonesContractMock.setIfMakerCanTerminate(true)

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
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

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

  it("should let setting milestones contract address by the contract owner.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)

    let address = await decoProjects.milestonesContractAddress.call()

    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )

    let newAddress = await decoProjects.milestonesContractAddress.call()
    expect(address).to.be.not.equal(newAddress)
    expect(newAddress).to.be.equal(milestonesContractMock.address)
  })

  it("should fail setting 0x0 milestones contract address.", async () => {
    let address = await decoProjects.milestonesContractAddress.call()

    await decoProjects.setMilestonesContractAddress(
      "0x0",
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let newAddress = await decoProjects.milestonesContractAddress.call()
      expect(address).to.be.equal(newAddress)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail setting the same milestones contract address.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)

    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )

    let address = await decoProjects.milestonesContractAddress.call()

    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let newAddress = await decoProjects.milestonesContractAddress.call()
      expect(address).to.be.equal(newAddress)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail setting the milestones contract address by not the owner.", async () => {
    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)

    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
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
    mock.agreementId = `${projectId++}`
    mock.maker = accounts[6]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.maker = accounts[7]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.maker = accounts[8]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.maker = accounts[9]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.agreementId = `${projectId++}`
    mock.maker = accounts[10]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.client = accounts[6]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.client = accounts[7]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.client = accounts[8]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
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
    mock.agreementId = `${projectId++}`
    mock.client = accounts[9]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.agreementId = `${projectId++}`
    mock.client = accounts[10]
    testAgreementHash = web3.sha3(mock.agreementId)
    signature = web3.eth.sign(mock.maker, testAgreementHash)
    await StartProject(signature, mock.client)
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)
  })

  it("should add supplemental agreement successfully for the existing project.", async () => {
    await StartProject(signature, mock.client)

    let supplementalAgreementDocId = "IPFS_DOCUMENT"
    let messageForSigning = web3.sha3(supplementalAgreementDocId)
    signature = web3.eth.sign(mock.maker, messageForSigning)
    mock.milestonesCount = mock.milestonesCount.plus(1)
    mock.paymentWindow = mock.paymentWindow.plus(2)
    mock.feedbackWindow = mock.feedbackWindow.plus(3)
    await decoProjects.saveSupplementalAgreement(
      testAgreementHash,
      supplementalAgreementDocId,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      { from: mock.client, gasPrice: 1 }
    )

    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let newProject = new Project(projectArray)
    expect(newProject.milestonesCount.toNumber()).to.be.equal(mock.milestonesCount.toNumber())
    expect(newProject.paymentWindow.toNumber()).to.be.equal(mock.paymentWindow.toNumber())
    expect(newProject.feedbackWindow.toNumber()).to.be.equal(mock.feedbackWindow.toNumber())

    let supplementalAgreementId = await decoProjects.getSupplementalAgreementId(testAgreementHash, 0)
    expect(supplementalAgreementId).to.be.equal(supplementalAgreementDocId)
  })

  it("should fail adding supplemental agreement when transaction is sent by not a client.", async () => {
    await StartProject(signature, mock.client)

    let supplementalAgreementDocId = "IPFS_DOCUMENT"
    let messageForSigning = web3.sha3(supplementalAgreementDocId)
    signature = web3.eth.sign(mock.maker, messageForSigning)
    mock.milestonesCount = mock.milestonesCount.plus(1)
    mock.paymentWindow = mock.paymentWindow.plus(2)
    mock.feedbackWindow = mock.feedbackWindow.plus(3)
    await decoProjects.saveSupplementalAgreement(
      testAgreementHash,
      supplementalAgreementDocId,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for the transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let project = new Project(projectArray)

      project.assertWithCreationParams(
        mock.agreementId,
        mock.client,
        mock.maker,
        mock.arbiter,
        mock.paymentWindow.minus(2),
        mock.feedbackWindow.minus(3),
        mock.milestonesCount.minus(1),
        mock.agreementsEncrypted
      )

      let supplementalAgreementId = await decoProjects.getSupplementalAgreementId(testAgreementHash, 0)
      expect(supplementalAgreementId).to.be.not.equal(supplementalAgreementDocId)
      expect(supplementalAgreementId).to.be.empty
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail adding supplemental agreement if makers signature is invalid.", async () => {
    await StartProject(signature, mock.client)

    let supplementalAgreementDocId = "IPFS_DOCUMENT"
    let messageForSigning = web3.sha3(supplementalAgreementDocId)
    mock.milestonesCount = mock.milestonesCount.plus(1)
    mock.paymentWindow = mock.paymentWindow.plus(2)
    mock.feedbackWindow = mock.feedbackWindow.plus(3)
    await decoProjects.saveSupplementalAgreement(
      testAgreementHash,
      supplementalAgreementDocId,
      signature, // original signature from the project creation process, should be unique for the new agreement.
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for the transaction.")
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let project = new Project(projectArray)

      project.assertWithCreationParams(
        mock.agreementId,
        mock.client,
        mock.maker,
        mock.arbiter,
        mock.paymentWindow.minus(2),
        mock.feedbackWindow.minus(3),
        mock.milestonesCount.minus(1),
        mock.agreementsEncrypted
      )
      let supplementalAgreementId = await decoProjects.getSupplementalAgreementId(testAgreementHash, 0)
      expect(supplementalAgreementId).to.not.be.equal(supplementalAgreementDocId)
      expect(supplementalAgreementId).to.be.empty
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail adding supplemental agreement if the given project doesn't exist.", async () => {
    let supplementalAgreementDocId = "IPFS_DOCUMENT"
    let messageForSigning = web3.sha3(supplementalAgreementDocId)
    signature = web3.eth.sign(mock.maker, messageForSigning)
    mock.milestonesCount = mock.milestonesCount.plus(1)
    mock.paymentWindow = mock.paymentWindow.plus(2)
    mock.feedbackWindow = mock.feedbackWindow.plus(3)
    await decoProjects.saveSupplementalAgreement(
      testAgreementHash,
      supplementalAgreementDocId,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
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

  it(
    "should emit the event upon completion of adding new supplemenatal agreement.",
    async () => {
      await StartProject(signature, mock.client)

      let supplementalAgreementDocId = "IPFS_DOCUMENT"
      let messageForSigning = web3.sha3(supplementalAgreementDocId)

      signature = web3.eth.sign(mock.maker, messageForSigning)
      mock.milestonesCount = mock.milestonesCount.plus(1)
      mock.paymentWindow = mock.paymentWindow.plus(2)
      mock.feedbackWindow = mock.feedbackWindow.plus(3)
      let txn = await decoProjects.saveSupplementalAgreement(
        testAgreementHash,
        supplementalAgreementDocId,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )

      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let newProject = new Project(projectArray)

      let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      expect(txn.logs).to.have.length(1)
      expect(txn.logs[0].event).to.be.equal("NewSupplementalAgreement")
      expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
      expect(txn.logs[0].args.supplementalAgreementHash).to.be.equal(supplementalAgreementDocId)
      expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockNumInfo.timestamp)
  })

  it(
    "should add a supplemental agreement for the existing project if the last milestone is accepted.",
    async () => {
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setLastMilestoneNumber(
        mock.milestonesCount.minus(1).toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setIsLastMilestoneAccepted(
        true,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      let supplementalAgreementDocId = "IPFS_DOCUMENT"
      let messageForSigning = web3.sha3(supplementalAgreementDocId)
      signature = web3.eth.sign(mock.maker, messageForSigning)
      mock.milestonesCount = mock.milestonesCount.plus(1)
      mock.paymentWindow = mock.paymentWindow.plus(2)
      mock.feedbackWindow = mock.feedbackWindow.plus(3)
      await decoProjects.saveSupplementalAgreement(
        testAgreementHash,
        supplementalAgreementDocId,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        { from: mock.client, gasPrice: 1 }
      )

      let projectArray = await decoProjects.projects.call(testAgreementHash)
      expect(projectArray[0]).to.not.be.empty
      let newProject = new Project(projectArray)
      expect(newProject.milestonesCount.toNumber()).to.be.equal(mock.milestonesCount.toNumber())
      expect(newProject.paymentWindow.toNumber()).to.be.equal(mock.paymentWindow.toNumber())
      expect(newProject.feedbackWindow.toNumber()).to.be.equal(mock.feedbackWindow.toNumber())

      let supplementalAgreementId = await decoProjects.getSupplementalAgreementId(testAgreementHash, 0)
      expect(supplementalAgreementId).to.be.equal(supplementalAgreementDocId)
  })

  it(
    "should fail adding a supplemental agreement for the existing project if the last milestone is active.",
    async () => {
      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setLastMilestoneNumber(
        mock.milestonesCount.minus(1).toNumber(),
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setIsLastMilestoneAccepted(
        false,
        { from: mock.client, gasPrice: 1 }
      )

      await StartProject(signature, mock.client)

      let supplementalAgreementDocId = "IPFS_DOCUMENT"
      let messageForSigning = web3.sha3(supplementalAgreementDocId)
      signature = web3.eth.sign(mock.maker, messageForSigning)
      mock.milestonesCount = mock.milestonesCount.plus(1)
      mock.paymentWindow = mock.paymentWindow.plus(2)
      mock.feedbackWindow = mock.feedbackWindow.plus(3)
      await decoProjects.saveSupplementalAgreement(
        testAgreementHash,
        supplementalAgreementDocId,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        { from: mock.client, gasPrice: 1 }
      ).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        let supplementalAgreementId = await decoProjects.getSupplementalAgreementId(testAgreementHash, 0)
        expect(supplementalAgreementId).to.not.be.equal(supplementalAgreementDocId)
        expect(supplementalAgreementId).to.be.empty
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
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
})
