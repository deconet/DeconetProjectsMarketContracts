var BigNumber = require("bignumber.js")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoEscrowStub = artifacts.require("./DecoEscrowStub.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

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
    test(ZERO_ADDRESS)
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
      ZERO_ADDRESS,
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
    let decoRelay = await DecoRelay.deployed()
    await decoEscrowFactory.setRelayContract(decoRelay.address, {from: accounts[0], gasPrice: 1})
    let address = decoMilestones.address
    let newEscrowCloneTxn = await decoEscrowFactory.createEscrow(
      accounts[1],
      address,
      {from: accounts[8], gasPrice: 1}
    )
    let emittedEvent = newEscrowCloneTxn.logs[0]
    expect(emittedEvent.event).to.be.equal("EscrowCreated")
    decoEscrowStub = await DecoEscrowStub.at(emittedEvent.args.newEscrowAddress)
    let newContractOwner = await decoEscrowStub.newOwner.call()
    let authorizedAddress = await decoEscrowStub.authorizedAddress.call()
    let newFeesValue = await decoEscrowStub.shareFee.call()
    let relayFeesValue = await decoRelay.shareFee.call()
    let newRelayAddress = await decoEscrowStub.relayContract.call()
    expect(newContractOwner).to.be.equal(accounts[1])
    expect(address).to.be.equal(authorizedAddress)
    expect(newFeesValue.toNumber()).to.be.equal(relayFeesValue.toNumber())
    expect(newRelayAddress).to.be.equal(decoRelay.address)
  })
})
