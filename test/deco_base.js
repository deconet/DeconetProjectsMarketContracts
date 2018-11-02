let DecoProjects = artifacts.require("./DecoProjects.sol")
let DecoMilestones = artifacts.require("./DecoMilestones.sol")
let DecoRelay = artifacts.require("./DecoRelay.sol")
let DecoBaseProjectsMarketplace = artifacts.require("./DecoBaseProjectsMarketplace.sol")

contract("DecoBaseProjectsMarketplace", async (accounts) => {
  let base = undefined

  beforeEach(async () => {
    base = await DecoBaseProjectsMarketplace.new({from: accounts[0], gasPrice: 1})
  })

  it("should revert any incoming ETH.", async () => {
    let txn = await base.sendTransaction(
      { from: accounts[0], value: web3.toWei(1) }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for any incoming ETH transaction.")
      let balance = await web3.eth.getBalance(base.address)
      expect(balance.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })

  it("should let setting relay contract address by the contract owner.", async () => {
    let decoRelay = await DecoRelay.deployed()
    await base.setRelayContractAddress(
      decoRelay.address,
      { from: accounts[0], gasPrice: 1 }
    )

    let newAddress = await base.relayContractAddress.call()
    expect(newAddress).to.be.equal(decoRelay.address)
  })

  it("should fail setting 0x0 milestones contract address.", async () => {
    let decoRelay = await DecoRelay.deployed()
    let address = decoRelay.address
    await base.setRelayContractAddress(
      address,
      { from: accounts[0], gasPrice: 1 }
    )

    await base.setRelayContractAddress(
      "0x0",
      { from: accounts[0], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let newAddress = await base.relayContractAddress.call()
      expect(address).to.be.equal(newAddress)
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail setting the relay contract address by not the owner.", async () => {
    let decoRelay = await DecoRelay.deployed()

    await base.setRelayContractAddress(
      decoRelay.address,
      { from: accounts[8], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })
})
