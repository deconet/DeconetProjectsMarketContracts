var BigNumber = require('bignumber.js')
var DecoProjects = artifacts.require("./DecoProjects.sol")

class Project {
  constructor(contractStructArray) {
    this.client = contractStructArray[0]
    this.maker = contractStructArray[1]
    this.arbiter = contractStructArray[2]
    this.startDate = contractStructArray[3]
    this.endDate = contractStructArray[4]
    this.paymentWindow = contractStructArray[5]
    this.feedbackWindow = contractStructArray[6]
    this.milestonesCount = contractStructArray[7]
    this.customerSatisfaction = contractStructArray[8]
    this.makerSatisfaction = contractStructArray[9]
    this.agreementsEncrypted = contractStructArray[10]
  }

  assertProjectWithParams(
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
    client,
    maker,
    arbiter,
    paymentWindow,
    feedbackWindow,
    milestonesCount,
    agreementsEncrypted
  ) {
    this.assertProjectWithParams(
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

  static createValidProjectInstance(accounts) {
    return new Project(
      [
        accounts[0],
        accounts[1],
        accounts[2],
        new BigNumber(new Date().getTime() / 1000),
        new BigNumber(Math.round(new Date().getTime() / 1000) + 30 * 24 * 60 * 60),
        new BigNumber('3'),
        new BigNumber('4'),
        new BigNumber('5'),
        new BigNumber('0'),
        new BigNumber('0'),
        false
      ]
    )
  }
}

contract("DecoProjects", (accounts) => {
  it("should start the project with maker address and matching signature.", async () => {
    const decoProjects = await DecoProjects.deployed()
    const testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM"))
    let clientAccount = accounts[0]
    let arbiterAccount = accounts[1]
    let makerAccount = accounts[2]
    const makerSignature = web3.eth.sign(makerAccount, testAgreementHash)
    const milestonesCount = new BigNumber('3')
    const paymentWindow = new BigNumber('3')
    const feedbackWindow = new BigNumber('3')
    await decoProjects.startProject(
      testAgreementHash,
      clientAccount,
      arbiterAccount,
      makerAccount,
      makerSignature,
      milestonesCount.toNumber(),
      paymentWindow.toNumber(),
      feedbackWindow.toNumber(),
      false,
      { from: clientAccount, gasPrice: 1 }
    )
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    project.assertWithCreationParams(
      clientAccount,
      makerAccount,
      arbiterAccount,
      paymentWindow,
      feedbackWindow,
      milestonesCount,
      false
    )
  })

  it("should fail project creation if makers signature isn't valid.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let projectMock = Project.createValidProjectInstance(accounts)
    let testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM1"))
    let signature = web3.eth.sign(projectMock.client, testAgreementHash)
    try {
      await decoProjects.startProject(
        testAgreementHash,
        projectMock.client,
        projectMock.arbiter,
        projectMock.maker,
        signature,
        projectMock.milestonesCount.toNumber(),
        projectMock.paymentWindow.toNumber(),
        projectMock.feedbackWindow.toNumber(),
        projectMock.agreementsEncrypted,
        { from: projectMock.client, gasPrice: 1 }
      )
      assert.fail('Should have failed above.')
    } catch (err) {
      assert.isOk(err, 'Exception should be thrown for the transaction.')
    }
  })

  it("should fail project creation if msg.sender is different from 'client' param.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let projectMock = Project.createValidProjectInstance(accounts)
    let testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM2"))
    let signature = web3.eth.sign(projectMock.maker, testAgreementHash)
    try {
      await decoProjects.startProject (
        testAgreementHash,
        projectMock.client,
        projectMock.arbiter,
        projectMock.maker,
        signature,
        projectMock.milestonesCount.toNumber(),
        projectMock.paymentWindow.toNumber(),
        projectMock.feedbackWindow.toNumber(),
        projectMock.agreementsEncrypted,
        { from: accounts[7], gasPrice: 1 }
      )
      assert.fail('Should have failed above.')
    } catch (err) {
      assert.isOk(err, 'Exception should be thrown for the transaction.')
    }
  })

  it("should validate milestones count to be within the range 1-24.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let projectMock = Project.createValidProjectInstance(accounts)
    let testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM3"))
    let signature = web3.eth.sign(projectMock.maker, testAgreementHash)

    await decoProjects.startProject (
      testAgreementHash,
      projectMock.client,
      projectMock.arbiter,
      projectMock.maker,
      signature,
      projectMock.milestonesCount.toNumber(),
      projectMock.paymentWindow.toNumber(),
      projectMock.feedbackWindow.toNumber(),
      projectMock.agreementsEncrypted,
      { from: projectMock.client, gasPrice: 1 }
    )
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    expect(project.milestonesCount.eq(projectMock.milestonesCount)).to.be.true

    testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM4"))
    try {
      await decoProjects.startProject (
        testAgreementHash,
        projectMock.client,
        projectMock.arbiter,
        projectMock.maker,
        signature,
        0, // milestones number value is out of the range
        projectMock.paymentWindow.toNumber(),
        projectMock.feedbackWindow.toNumber(),
        projectMock.agreementsEncrypted,
        { from: projectMock.client, gasPrice: 1 }
      )
      assert.fail('Should have failed above.')
    } catch (err) {
      assert.isOk(err, 'Exception should be thrown for that transaction.')
    }

    testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM5"))
    try {
      await decoProjects.startProject (
        testAgreementHash,
        projectMock.client,
        projectMock.arbiter,
        projectMock.maker,
        signature,
        25, // milestones number value is out of the range
        projectMock.paymentWindow.toNumber(),
        projectMock.feedbackWindow.toNumber(),
        projectMock.agreementsEncrypted,
        { from: projectMock.client, gasPrice: 1 }
      )
      assert.fail('Should have failed above.')
    } catch (err) {
      assert.isOk(err, 'Exception should be thrown for that transaction.')
    }
  })

  it("should set start date to be approximately equal to now", async () => {
    let decoProjects = await DecoProjects.deployed()
    let projectMock = Project.createValidProjectInstance(accounts)
    let testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM6"))
    let signature = web3.eth.sign(projectMock.maker, testAgreementHash)

    let txn = await decoProjects.startProject (
      testAgreementHash,
      projectMock.client,
      projectMock.arbiter,
      projectMock.maker,
      signature,
      projectMock.milestonesCount.toNumber(),
      projectMock.paymentWindow.toNumber(),
      projectMock.feedbackWindow.toNumber(),
      projectMock.agreementsEncrypted,
      { from: projectMock.client, gasPrice: 1 }
    )
    let blockNumInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    let projectArray = await decoProjects.projects.call(testAgreementHash)
    expect(projectArray[0]).to.not.be.undefined
    let project = new Project(projectArray)
    let blockTimestamp = new BigNumber(blockNumInfo.timestamp)
    expect(project.startDate.eq(blockTimestamp)).to.be.true
  })

  it("should add new project to the lists of client`s and maker`s projects.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let projectMock = Project.createValidProjectInstance(accounts)
    let testAgreementHash = web3.sha3(web3.fromUtf8("QmS8fdQE1RyzETQtjXik71eUdXSeTo8f9L1eo6ALEDmtVM7"))
    let signature = web3.eth.sign(projectMock.maker, testAgreementHash)

    await decoProjects.startProject(
      testAgreementHash,
      projectMock.client,
      projectMock.arbiter,
      projectMock.maker,
      signature,
      projectMock.milestonesCount.toNumber(),
      projectMock.paymentWindow.toNumber(),
      projectMock.feedbackWindow.toNumber(),
      projectMock.agreementsEncrypted,
      {from: projectMock.client, gasPrice: 1 }
    )
    let clientProjects = await decoProjects.getClientProjects.call(projectMock.client)
    let makerProjects = await decoProjects.getMakerProjects.call(projectMock.maker)

    expect(clientProjects).to.include(testAgreementHash)
    expect(makerProjects).to.include(testAgreementHash)
  })
})
