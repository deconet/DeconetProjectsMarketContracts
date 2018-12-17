var BigNumber = require("bignumber.js")
var abi = require('ethereumjs-abi')
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestonesStub = artifacts.require("./DecoMilestonesStub.sol")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoProjectsMock = artifacts.require("./DecoProjectsMock.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")
var DecoArbitrationStub = artifacts.require("./DecoArbitrationStub.sol")
var DecoTest = artifacts.require("./DecoTest.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })

class Project {
  constructor(contractStructArray) {
    this.agreementId = contractStructArray[0]
    this.client = contractStructArray[1]
    this.maker = contractStructArray[2]
    this.arbiter = contractStructArray[3]
    this.escrowContractAddress = contractStructArray[4]
    this.startDate = new BigNumber(contractStructArray[5])
    this.endDate = new BigNumber(contractStructArray[6])
    this.milestoneStartWindow = new BigNumber(contractStructArray[7])
    this.feedbackWindow = new BigNumber(contractStructArray[8])
    this.milestonesCount = new BigNumber(contractStructArray[9])
    this.customerSatisfaction = new BigNumber(contractStructArray[10])
    this.makerSatisfaction = new BigNumber(contractStructArray[11])
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

  const typedData = {
      types: {
          EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
          ],
          Proposal: [
              { name: 'agreementId', type: 'string' },
              { name: 'arbiter', type: 'address' }
          ]
      },
      primaryType: 'Proposal',
      domain: {
          name: 'Deco.Network',
          version: '1',
          chainId: 95,
          verifyingContract: '',
      }
  };

  const types = typedData.types;

  // Recursively finds all the dependencies of a type
  const dependencies = (primaryType, found = []) => {
      if (found.includes(primaryType)) {
          return found;
      }
      if (types[primaryType] === undefined) {
          return found;
      }
      found.push(primaryType);
      for (let field of types[primaryType]) {
          for (let dep of dependencies(field.type, found)) {
              if (!found.includes(dep)) {
                  found.push(dep);
              }
          }
      }
      return found;
  }

  const encodeType = (primaryType) => {
      // Get dependencies primary first, then alphabetical
      let deps = dependencies(primaryType);
      deps = deps.filter(t => t != primaryType);
      deps = [primaryType].concat(deps.sort());

      // Format as a string with fields
      let result = '';
      for (let type of deps) {
          result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
      }
      return result;
  }

  const typeHash = (primaryType) => {
      return web3.utils.soliditySha3(encodeType(primaryType));
  }

  const encodeData = (primaryType, data) => {
    let encTypes = [];
    let encValues = [];

    // Add typehash
    encTypes.push('bytes32');
    encValues.push(typeHash(primaryType));

    // Add field contents
    for (let field of types[primaryType]) {
      let value = data[field.name];
      if (field.type == 'string' || field.type == 'bytes') {
        encTypes.push('bytes32');
        value = web3.utils.soliditySha3(value);
        encValues.push(value);
      } else if (types[field.type] !== undefined) {
        encTypes.push('bytes32');
        value = web3.utils.soliditySha3(encodeData(field.type, value));
        encValues.push(value);
      } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
        throw 'TODO: Arrays currently unimplemented in encodeData';
      } else {
        encTypes.push(field.type);
        encValues.push(value);
      }
    }
    // console.log('encoding types: ', encTypes)
    // console.log('encoding values: ', encValues)
    return abi.rawEncode(encTypes, encValues);
  }

  const structHash = (primaryType, data) => {
    let hashedStruct = web3.utils.soliditySha3(encodeData(primaryType, data))
    console.log('hashedStruct: '+hashedStruct.substring(2))
    return Buffer.from(hashedStruct.substring(2), 'hex');
  }

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
    console.log('starting project with signature: ' + sign)
    return await decoProjects.startProject(
      mock.agreementId,
      mock.client,
      mock.arbiter,
      mock.maker,
      sign,
      mock.milestonesCount.toString(),
      mock.milestoneStartWindow.toString(),
      mock.feedbackWindow.toString(),
      mock.agreementsEncrypted,
      { from: sender, gasPrice: 1 }
    )
  }

  const RefreshSignatureAndHashes = async (decoProjectsAddress) => {
    testAgreementHash = web3.utils.soliditySha3(mock.agreementId)

    typedData.domain.verifyingContract = decoProjectsAddress;
    // const bufferToSign = Buffer.concat([
    //     Buffer.from('1901', 'hex'),
    //     structHash('EIP712Domain', typedData.domain),
    //     structHash(typedData.primaryType, { agreementId: mock.agreementId, arbiter: mock.arbiter }),
    // ])
    const toSign = abi.solidityPack(
      [
        'bytes', 'bytes32', 'bytes32'
      ],
      [
        Buffer.from('1901', 'hex'),
        structHash('EIP712Domain', typedData.domain),
        structHash(typedData.primaryType, { agreementId: mock.agreementId, arbiter: mock.arbiter }),
      ]
    )
    console.log('hashing this: '+'0x' + toSign.toString('hex'))
    signatureHash = web3.utils.soliditySha3('0x' + toSign.toString('hex'))
    console.log('signatureHash: '+signatureHash)
    signature = await web3.eth.sign(signatureHash,mock.maker);
  }

  const GenerateNewAgreementId = async () => {
    mock.agreementId = `test${projectId++}`
  }

  beforeEach(async () => {
    decoProjects = await DecoProjects.deployed(95)
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
    await RefreshSignatureAndHashes(decoProjects.address)
  })

  it("should start the project with maker address and matching signature.", async () => {
    let txn = await StartProject(signature, mock.client)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    let events = await decoEscrowFactory.getPastEvents(
      "EscrowCreated",
      {fromBlock: "latest", toBlock: "latest"}
    )
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
    signature = await web3.eth.sign(signatureHash, mock.client)

    await StartProject(signature, mock.client).catch(async (err) => {
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
      await RefreshSignatureAndHashes()
      await StartProject(signature, mock.client).catch(async (err) => {
        assert.isOk(err, "Exception should be thrown for the transaction.")
        mock.maker = maker
        await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client).catch((err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })

    mock.milestonesCount = new BigNumber("25")
    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
    let testAgreementHash1 = testAgreementHash
    let signature1 = signature
    await StartProject(signature1, mock.client)

    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
    let testAgreementHash2 = testAgreementHash
    let signature2 = signature
    await StartProject(signature2, mock.client)

    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
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
    expect(emittedEvent.event).to.be.equal("LogProjectStateUpdate")
    expect(emittedEvent.args.agreementHash).to.be.equal(testAgreementHash)
    expect(emittedEvent.args.updatedBy).to.be.equal(mock.client)
    expect(emittedEvent.args.timestamp.toNumber()).to.be.equal(blockNumInfo.timestamp)
    expect(emittedEvent.args.state.toNumber()).to.be.equal(0)
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
    expect(txn.logs[0].event).to.be.equal("LogProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.maker)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(2)

    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)

    txn = await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )

    blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(txn.logs).to.have.lengthOf.at.least(1)
    expect(txn.logs[0].event).to.be.equal("LogProjectStateUpdate")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.updatedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.timestamp.toNumber()).to.be.equal(blockInfo.timestamp)
    expect(txn.logs[0].args.state.toNumber()).to.be.equal(2)

    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    txn = await decoMilestonesStub.terminateProjectAsDisputeResult(
      testAgreementHash,
      {from: mock.client, gasPrice: 1}
    )

    let logs = await decoProjects.getPastEvents(
      "LogProjectStateUpdate",
      {fromBlock: "latest", toBlock: "latest"}
    )
    blockInfo = await web3.eth.getBlock(txn.receipt.blockNumber)
    expect(logs).to.have.lengthOf.at.least(1)
    expect(logs[0].event).to.be.equal("LogProjectStateUpdate")
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
    expect(txn.logs[0].event).to.be.equal("LogProjectRated")
    expect(txn.logs[0].args.agreementHash).to.be.equal(testAgreementHash)
    expect(txn.logs[0].args.ratedBy).to.be.equal(mock.client)
    expect(txn.logs[0].args.ratingTarget).to.be.equal(mock.maker)
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
      let { '0': actualRating, '1': endedProjectsCount } = await decoProjects.clientsAverageRating(mock.client)
      actualRating = new BigNumber(actualRating).div(endedProjectsCount)
      endedProjectsCount = new BigNumber(endedProjectsCount)
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.maker = accounts[10]
    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)

    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)
  })

  it("should calculate correctly average CSAT for the maker", async () => {
    const validateScoreCalculations = async (expectedRating) => {
      let { '0': actualRating, '1': endedProjectsCount } = await decoProjects.makersAverageRating(mock.maker)
      actualRating = new BigNumber(actualRating).div(endedProjectsCount)
      endedProjectsCount = new BigNumber(endedProjectsCount)
      expect(actualRating.toNumber()).to.be.equal(expectedRating)
    }

    // First completed and rated project
    mock.maker = accounts[5]
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
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
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await decoProjects.terminateProject(
      testAgreementHash,
      { from: mock.client, gasPrice: 1 }
    )
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)

    // Sixth active project
    mock.client = accounts[10]
    GenerateNewAgreementId()
    await RefreshSignatureAndHashes()
    await StartProject(signature, mock.client)
    await validateScoreCalculations((1 + 2 + 3 + 4) / 4)
  })

  it("should correctly return project existence status.", async () => {
    let projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.false
    await StartProject(signature, mock.client)
    projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.true
    testAgreementHash = web3.utils.soliditySha3(notExistingAgreementId)
    projectExists = await decoProjects.checkIfProjectExists(testAgreementHash)
    expect(projectExists).to.be.false
  })

  it("should correctly get milestones count out of the existing project instance.", async () => {
    let milestonesCount = await decoProjects.getProjectMilestonesCount(testAgreementHash)
    expect(milestonesCount.toNumber()).to.be.equal(0)
    await StartProject(signature, mock.client)
    milestonesCount = await decoProjects.getProjectMilestonesCount(testAgreementHash)
    expect(milestonesCount.toNumber()).to.be.equal(mock.milestonesCount.toNumber())
    testAgreementHash = web3.utils.soliditySha3(notExistingAgreementId)
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
      await RefreshSignatureAndHashes()
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

      await RefreshSignatureAndHashes()
      mock.maker = accounts[10]
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker,
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false

      await RefreshSignatureAndHashes()
      signatureHash = web3.utils.soliditySha3(mock.agreementId, accounts[12])
      signature = await web3.eth.sign(signatureHash, mock.maker)
      result = await decoProjectsMock.testIsMakersSignatureValid(
        mock.maker,
        signature,
        mock.agreementId,
        mock.arbiter
      )

      expect(result).to.be.false

      await RefreshSignatureAndHashes()
      signatureHash = web3.utils.soliditySha3(mock.agreementId, mock.arbiter)
      signature = await web3.eth.sign(signatureHash, accounts[0])
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
    await RefreshSignatureAndHashes()

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee) => {
      let fixedFee = web3.utils.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      await StartProject(signature, mock.client)

      let actualFixedFee = await decoProjects.projectArbiterFixedFee.call(testAgreementHash)
      let actualShareFee = await decoProjects.projectArbiterShareFee.call(testAgreementHash)

      expect(actualFixedFee.toString()).to.be.equal(fixedFee)
      expect(actualShareFee.toNumber()).to.be.equal(shareFee)

      GenerateNewAgreementId()
      await RefreshSignatureAndHashes()
    }

    await startProjectAndCheckFees("1", 90)
    await startProjectAndCheckFees("4", 80)
    await startProjectAndCheckFees("0.0001", 80)
    await startProjectAndCheckFees("0.000001", 1)
  })

  it("should fail storing fees and fail project start if arbiter contract is invalid.", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee, arbiter) => {
      let fixedFee = web3.utils.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      mock.arbiter = arbiter
      await StartProject(signature, mock.client).catch(async (err) => {
        assert.isOk(err, "Expected exception.")

        let actualFixedFee = await decoProjects.projectArbiterFixedFee.call(testAgreementHash)
        let actualShareFee = await decoProjects.projectArbiterShareFee.call(testAgreementHash)

        expect(actualFixedFee.toString()).to.be.equal("0")
        expect(actualShareFee.toString()).to.be.equal("0")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await startProjectAndCheckFees("1", 90, accounts[9])
    await startProjectAndCheckFees("4", 80, accounts[10])
    await startProjectAndCheckFees("0.0001", 80, accounts[8])
    await startProjectAndCheckFees("0.000001", 1, accounts[5])
  })

  it("should return fees for the given project", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    mock.arbiter = arbitrationStub.address
    await RefreshSignatureAndHashes()

    let startProjectAndCheckFees = async (fixedFeeEther, shareFee) => {
      let fixedFee = web3.utils.toWei(fixedFeeEther)
      await arbitrationStub.setStubFees(fixedFee, shareFee)

      await StartProject(signature, mock.client)

      let fees = await decoProjects.getProjectArbitrationFees(testAgreementHash)

      expect(fees[0].toString()).to.be.equal(fixedFee)
      expect(fees[1].toNumber()).to.be.equal(shareFee)

      GenerateNewAgreementId()
      await RefreshSignatureAndHashes()
    }

    await startProjectAndCheckFees("1", 90)
    await startProjectAndCheckFees("4", 80)
    await startProjectAndCheckFees("0.0001", 80)
    await startProjectAndCheckFees("0.000001", 1)


    let fees = await decoProjects.getProjectArbitrationFees(testAgreementHash)
    expect(fees[0].toString()).to.be.equal("0")
    expect(fees[1].toString()).to.be.equal("0")
  })

  it("should correctly validate project for dispute and return required information.", async () => {
    let arbitrationStub = await DecoArbitrationStub.new({from: accounts[0], gasPrice: 1})

    let decoTest = await DecoTest.new({from: accounts[0], gasPrice: 1})

    mock.arbiter = arbitrationStub.address
    await RefreshSignatureAndHashes()
    let fixedFee = web3.utils.toWei("1")
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
        ZERO_ADDRESS,
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
      expect(value).to.be.equal(escrow)
      value = await decoProjects.getProjectClient(testAgreementHash)
      expect(value).to.be.equal(client)
      value = await decoProjects.getProjectMaker(testAgreementHash)
      expect(value).to.be.equal(maker)
      value = await decoProjects.getProjectArbiter(testAgreementHash)
      expect(value).to.be.equal(arbiter)
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
    await check(false, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, 0, 0, 0, 0, 0)
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
