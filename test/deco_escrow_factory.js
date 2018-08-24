var BigNumber = require("bignumber.js")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoEscrowStub = artifacts.require("./DecoEscrowStub.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")

contract("DecoEscrowFactory", async (accounts) => {
  it("should save provided library address during the contract deployment.", async () => {
    let test = async (libraryAddress) => {
      let decoEscrowFactory = await DecoEscrowFactory.new(libraryAddress, {from: accounts[0], gasPrice: 1})
      let libAddress = await decoEscrowFactory.libraryAddress.call({from: accounts[0], gasPrice: 1})
      expect(libAddress).to.be.equal(libraryAddress)
    }
    test(accounts[1])
    test(accounts[2])
    test(accounts[3])
    test("0x0000000000000000000000000000000000000000")
  })

  it("should successfully update library address with a valid address from the owner address.", async () => {
    let updateAddress = async (libraryAddress, newLibraryAddress) => {
      let decoEscrowFactory = await DecoEscrowFactory.new(libraryAddress, {from: accounts[0], gasPrice: 1})
      await decoEscrowFactory.setLibraryAddress(newLibraryAddress, {from: accounts[0], gasPrice: 1})
      return decoEscrowFactory.libraryAddress.call()
    }
    let newAddress = await updateAddress(accounts[1], accounts[2])
    expect(newAddress).to.be.equal(accounts[2])
    newAddress = await updateAddress(accounts[2], accounts[3])
    expect(newAddress).to.be.equal(accounts[3])
  })

  it("should fail to update library address with the same address.", async () => {
    let decoEscrowFactory = await DecoEscrowFactory.new(accounts[1], {from: accounts[0], gasPrice: 1})
    await decoEscrowFactory.setLibraryAddress(
      accounts[1],
      {from: accounts[0], gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Should throw exception here.")
      let libAddress = await decoEscrowFactory.libraryAddress.call()
      expect(libAddress).to.be.equal(accounts[1])
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })

  it("should fail to update library address from not the owner address.", async () => {
    let decoEscrowFactory = await DecoEscrowFactory.new(accounts[1], {from: accounts[0], gasPrice: 1})
    await decoEscrowFactory.setLibraryAddress(
      accounts[3],
      {from: accounts[2], gasPrice: 1} // owner address is not correct.
    ).catch(async (err) => {
      assert.isOk(err, "Should throw exception here.")
      let libAddress = await decoEscrowFactory.libraryAddress.call()
      expect(libAddress).to.be.equal(accounts[1])
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })

  it("should fail to update library address with 0x0 contract address.", async () => {
    let decoEscrowFactory = await DecoEscrowFactory.new(accounts[1], {from: accounts[0], gasPrice: 1})
    await decoEscrowFactory.setLibraryAddress(
      "0x0",
      {from: accounts[0], gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Should throw exception here.")
      let libAddress = await decoEscrowFactory.libraryAddress.call()
      expect(libAddress).to.be.equal(accounts[1])
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })

  it("should create Escrow clone successfully, initialize it, and emit the event.", async () => {
    let decoEscrowStub = await DecoEscrowStub.new({from: accounts[0], gasPrice: 1})
    let decoEscrowFactory = await DecoEscrowFactory.new(decoEscrowStub.address, {from: accounts[0], gasPrice: 1})
    let decoMilestones = await DecoMilestones.deployed()
    let decoProjects = await DecoProjects.deployed()
    let addresses = [decoMilestones.address, decoProjects.address]
    let newEscrowCloneTxn = await decoEscrowFactory.createEscrow(
      accounts[1],
      addresses,
      {from: accounts[0], gasPrice: 1}
    )
    expect(newEscrowCloneTxn.logs[0].event).to.be.equal("EscrowCreated")
    decoEscrowStub = await DecoEscrowStub.at(newEscrowCloneTxn.logs[0].args.newEscrowAddress)
    let newContractOwner = await decoEscrowStub.newOwner.call()
    let authorizedAddress1 = await decoEscrowStub.authorizedAddresses.call(0)
    let authorizedAddress2 = await decoEscrowStub.authorizedAddresses.call(1)
    expect(newContractOwner).to.be.equal(accounts[1])
    expect(addresses).to.include.members([authorizedAddress1.toString(), authorizedAddress2.toString()])
  })

  it("should fail creating Escrow clone if txn signed not from the owner's account.", async () => {
    let decoEscrowStub = await DecoEscrowStub.new({from: accounts[0], gasPrice: 1})
    let decoEscrowFactory = await DecoEscrowFactory.new(decoEscrowStub.address, {from: accounts[0], gasPrice: 1})
    let decoMilestones = await DecoMilestones.deployed()
    let decoProjects = await DecoProjects.deployed()
    let addresses = [decoMilestones.address, decoProjects.address]
    await decoEscrowFactory.createEscrow(
      accounts[1],
      addresses,
      {from: accounts[1], gasPrice: 1}
    ).catch(async (err) => {
      assert.isOk(err, "Should throw an exception here.")
    }).then(async (txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })
})
