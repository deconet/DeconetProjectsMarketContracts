var BigNumber = require("bignumber.js")
let DecoProjects = artifacts.require("./DecoProjects.sol")
let DecoMilestones = artifacts.require("./DecoMilestones.sol")
let DecoRelay = artifacts.require("./DecoRelay.sol")
let DecoBaseProjectsMarketplace = artifacts.require("./DecoBaseProjectsMarketplace.sol")
let DecoTestToken = artifacts.require("./DecoTestToken.sol")

contract("DecoBaseProjectsMarketplace", async (accounts) => {
  let base = undefined

  beforeEach(async () => {
    base = await DecoBaseProjectsMarketplace.new({from: accounts[0], gasPrice: 1})
  })

  it("should revert any incoming ETH and accept zero-txns.", async () => {
    await base.sendTransaction(
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

    await base.sendTransaction(
      { from: accounts[10], value: 0, gasPrice: 1 }
    )
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

  it("should return correct status of ownership.", async () => {
    let isOwner = await base.isOwner({from: accounts[0], gasPrice: 1})
    expect(isOwner).to.be.true
    isOwner = await base.isOwner({from: accounts[1], gasPrice: 1})
    expect(isOwner).to.be.false
    isOwner = await base.isOwner({from: accounts[2], gasPrice: 1})
    expect(isOwner).to.be.false
  })

  it("should transfer out ERC20 tokens or fail for invalid sender and invalid amount.", async () => {
    let testToken = await DecoTestToken.new({from: accounts[1], gasPrice: 1})
    let initialBalance = (new BigNumber(10)).pow(18).times(1000)
    await testToken.transfer(base.address, initialBalance.toString(), {from: accounts[1], gasPrice: 1})
    let transferAndTest = async (sender, amount) => {
      let initialSenderBalance = await testToken.balanceOf.call(sender)
      let initialContractBalance = await testToken.balanceOf.call(base.address)
      await base.transferAnyERC20Token(
        testToken.address,
        amount.toNumber(),
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Error is expected, balance should not changed.")
        expect(sender == accounts[0] && initialBalance.gt(amount)).to.be.false
        let senderBalance = await testToken.balanceOf.call(sender)
        let contractBalance = await testToken.balanceOf.call(base.address)
        expect(senderBalance.toNumber()).to.be.equal(initialSenderBalance.toNumber())
        expect(contractBalance.toNumber()).to.be.equal(initialContractBalance.toNumber())
      }).then(async (txn) => {
        if(txn) {
          expect(sender == accounts[0] && initialBalance.gt(amount)).to.be.true
          let senderBalance = await testToken.balanceOf.call(sender)
          let contractBalance = await testToken.balanceOf.call(base.address)
          expect(senderBalance.toNumber()).to.be.equal(initialSenderBalance.plus(amount).toNumber())
          expect(contractBalance.toNumber()).to.be.equal(initialContractBalance.minus(amount).toNumber())
          initialBalance = initialBalance.minus(amount)
        }
      })
    }
    await transferAndTest(
      accounts[0],
      initialBalance.div(4)
    )
    await transferAndTest(
      accounts[0],
      initialBalance.div(5)
    )
    await transferAndTest(
      accounts[3],
      initialBalance.div(5)
    )
    await transferAndTest(
      accounts[0],
      initialBalance.div(5)
    )
    await transferAndTest(
      accounts[0],
      initialBalance.times(2)
    )
    await transferAndTest(
      accounts[7],
      initialBalance.times(2)
    )
  })
})
