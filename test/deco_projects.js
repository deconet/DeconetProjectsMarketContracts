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
        agreementId === undefined ? "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM" : agreementId,
        accounts[0],
        accounts[1],
        accounts[2],
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(Math.round(new Date().getTime() / 1000) + 30 * 24 * 60 * 60),
        new BigNumber("3"),
        new BigNumber("4"),
        new BigNumber("5"),
        new BigNumber("0"),
        new BigNumber("0"),
        false
      ]
    )
  }
}

contract("DecoProjects", (accounts) => {
  it("should start the project with maker address and matching signature.", async () => {
    const decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM"
    )
    const testAgreementHash = web3.sha3(mock.agreementId)
    const makerSignature = web3.eth.sign(mock.maker, testAgreementHash)
    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      makerSignature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )
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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts,"QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM1")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.client, testAgreementHash)
    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    ).catch((err) => {
      assert.isOk(err, "Exception should be thrown for the transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail project creation if msg.sender is different from 'client' param.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts,"QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM2")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)
    await decoProjects.startProject (
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: accounts[7], gasPrice: 1 }
    ).catch((err) => {
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
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(accounts,"1QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM2")
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      await decoProjects.startProject (
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.client,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      ).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      await decoProjects.startProject (
        mock.agreementId,
        mock.client,
        mock.client,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      ).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

      await decoProjects.startProject (
        mock.agreementId,
        mock.client,
        mock.maker,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      ).catch((err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
      }).then((txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
  })

  it("should validate milestones count to be within the range 1-24.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts,"QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM3")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    await decoProjects.startProject (
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let project = new Project(projectArray)
    expect(project.milestonesCount.eq(mock.milestonesCount)).to.be.true

    mock.agreementId = "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM4"
    signature = web3.sha3(mock.agreementId)
    await decoProjects.startProject (
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      0, // milestones number value is out of the range
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    ).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })


    mock.agreementId = "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM5"
    signature = web3.sha3(mock.agreementId)
    await decoProjects.startProject (
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      25, // milestones number value is out of the range
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    ).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should set start date to be approximately equal to now", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM6")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let txn = await decoProjects.startProject (
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )
    let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.empty
    let project = new Project(projectArray)
    let blockTimestamp = new BigNumber(blockNumInfo.timestamp)
    expect(project.startDate.eq(blockTimestamp)).to.be.true
  })

  it("should fail to start a project with an existing agreement hash", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM7")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let startProject = async () => {
      return decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1}
      )
    }

    await startProject()
    await startProject()
      .catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should add new project to the lists of client`s and maker`s projects.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM8")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      {from: mock.client, gasPrice: 1 }
    )
    let clientProjects = await decoProjects.getClientProjects.call(mock.client)
    let makerProjects = await decoProjects.getMakerProjects.call(mock.maker)

    expect(clientProjects).to.include(testAgreementHash)
    expect(makerProjects).to.include(testAgreementHash)
  })

  it("should correctly return maker's and client's projects", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM9")
    let makersProjectsBefore = await decoProjects.getMakerProjects.call(mock.maker)
    let clientsProjectsBefore = await decoProjects.getClientProjects.call(mock.client)

    let testAgreementHash1= web3.sha3(mock.agreementId)
    let signature1 = web3.eth.sign(mock.maker, testAgreementHash1)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature1,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      {from: mock.client, gasPrice: 1 }
    )
    mock.agreementId = "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM10"
    let testAgreementHash2 = web3.sha3(mock.agreementId)
    let signature2 = web3.eth.sign(mock.maker, testAgreementHash2)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature2,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      {from: mock.client, gasPrice: 1 }
    )
    mock.agreementId = "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM11"
    let testAgreementHash3 = web3.sha3(mock.agreementId)
    let signature3 = web3.eth.sign(mock.maker, testAgreementHash3)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature3,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      {from: mock.client, gasPrice: 1 }
    )

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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM12")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let txn = await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

    let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.length(1)
    expect(txn.logs[0].event).to.be.equal("ProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockNumInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(0)
  })

  it("shouldn't emit the event when creation of a new project fails.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM13")
    let testAgreementHash = web3.sha3(mock.agreementId)
    // A signature below is created by not a maker, should cause an exception in contract.
    let signature = web3.eth.sign(accounts[4], testAgreementHash)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
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
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(
        accounts,
        "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM14"
      )
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      )

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
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(
        accounts,
        "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM15"
      )
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      )

      await milestonesContractMock.setIfClientCanTerminate(false)

      await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      ).catch(async (err) => {
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
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(
        accounts,
        "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM16"
      )
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      )

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
    "shouldn't let project's client to terminate the project if the last milestone state isn't valid.",
    async () => {
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(
        accounts,
        "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM17"
      )
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

      await decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      )

      await milestonesContractMock.setIfMakerCanTerminate(false)

      await decoProjects.terminateProject(
        testAgreementHash,
        { from: mock.maker, gasPrice: 1 }
      ).catch(async (err) => {
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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM18"
    )
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

    await milestonesContractMock.setIfMakerCanTerminate(true)
    await milestonesContractMock.setIfClientCanTerminate(true)

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: accounts[4], gasPrice: 1 }
    ).catch(async (err) => {
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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM19"
    )
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(milestonesContractMock.address)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM20"
    )
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

    await decoProjects.terminateProject(
      testAgreementHash,
      { from: accounts[3], gasPrice: 1 }
    ).catch(async (err) => {
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
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(accounts, "INVALID_PROJECT_ID")
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

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
    "should let the client to complete the project upon acceptance of the last milestone.",
    async () => {
      let decoProjects = await DecoProjects.deployed()
      let mock = Project.createValidProjectInstance(
        accounts,
        "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM21"
      )
      let testAgreementHash = web3.sha3(mock.agreementId)
      let signature = web3.eth.sign(mock.maker, testAgreementHash)

      let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
      await decoProjects.setMilestonesContractAddress(
        milestonesContractMock.address,
        { from: mock.client, gasPrice: 1 }
      )
      await milestonesContractMock.setProjectContractAddress(
        decoProjects.address,
        { from: mock.client, gasPrice: 1 }
      )

      await decoProjects.startProject(
        mock.agreementId,
        mock.client,
        mock.arbiter,
        mock.maker,
        signature,
        mock.milestonesCount.toNumber(),
        mock.paymentWindow.toNumber(),
        mock.feedbackWindow.toNumber(),
        mock.agreementsEncrypted,
        { from: mock.client, gasPrice: 1 }
      )

      let txn = await milestonesContractMock.acceptLastMilestone(
        testAgreementHash,
        { from: mock.client, gasPrice: 1 }
      )
      let blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)

      expect(project.endDate.toNumber()).to.be.equal(blockInfo.timestamp)
  })

  it("shouldn't allow anybody else beside the client to complete the project", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM22"
    )
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

    await milestonesContractMock.acceptLastMilestone(
      testAgreementHash,
      { from: mock.maker, gasPrice: 1 }
    ).catch(async (err) => {
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    await milestonesContractMock.acceptLastMilestone(
      testAgreementHash,
      { from: mock.arbiter, gasPrice: 1 }
    ).catch(async (err) => {
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail to complete if it is called not from the milestones contract", async () => {
    let decoProjects = await DecoProjects.deployed()
    let mock = Project.createValidProjectInstance(
      accounts,
      "QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM23"
    )
    let testAgreementHash = web3.sha3(mock.agreementId)
    let signature = web3.eth.sign(mock.maker, testAgreementHash)

    let milestonesContractMock = await DeployMilestonesContractMock(mock.client)
    await decoProjects.setMilestonesContractAddress(
      milestonesContractMock.address,
      { from: mock.client, gasPrice: 1 }
    )
    await milestonesContractMock.setProjectContractAddress(
      decoProjects.address,
      { from: mock.client, gasPrice: 1 }
    )

    await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      signature,
      mock.milestonesCount.toNumber(),
      mock.paymentWindow.toNumber(),
      mock.feedbackWindow.toNumber(),
      mock.agreementsEncrypted,
      { from: mock.client, gasPrice: 1 }
    )

    await decoProjects.completeProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    ).catch(async (err) => {
      let projectArray = await decoProjects.projects.call(testAgreementHash)
      let project = new Project(projectArray)
      expect(project.endDate.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })
})
