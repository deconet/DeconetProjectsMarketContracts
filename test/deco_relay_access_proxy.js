var BigNumber = require("bignumber.js")
let DecoRelay = artifacts.require("./DecoRelay.sol")
let DecoRelayAccessProxy = artifacts.require("./DecoRelayAccessProxy.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })


contract("DecoRelayAccessProxy", async (accounts) => {
  let proxy = undefined

  beforeEach(async () => {
    proxy = await DecoRelayAccessProxy.new({ from: accounts[0], gasPrice: 1 })
  })

  it("should let setting relay contract address by the contract owner.", async () => {
    let decoRelay = await DecoRelay.deployed()
    await proxy.setRelayContract(
      decoRelay.address,
      { from: accounts[0], gasPrice: 1 }
    )

    let newAddress = await proxy.relayContract.call()
    expect(newAddress).to.be.equal(decoRelay.address)
  })

  it("should fail setting 0x0 milestones contract address.", async () => {
    let decoRelay = await DecoRelay.deployed()
    let address = decoRelay.address
    await proxy.setRelayContract(
      address,
      { from: accounts[0], gasPrice: 1 }
    )

    await proxy.setRelayContract(
      ZERO_ADDRESS,
      { from: accounts[0], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
      let newAddress = await proxy.relayContract.call()
      expect(address).to.be.equal(newAddress)
    }).then((txn) => {
      if (txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail setting the relay contract address by not the owner.", async () => {
    let decoRelay = await DecoRelay.deployed()

    await proxy.setRelayContract(
      decoRelay.address,
      { from: accounts[8], gasPrice: 1 }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for that transaction.")
    }).then((txn) => {
      if (txn) {
        assert.fail("Should have failed above.")
      }
    })
  })
})
