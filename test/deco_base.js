var BigNumber = require("bignumber.js")
let DecoBaseProjectsMarketplace = artifacts.require("./DecoBaseProjectsMarketplace.sol")
let DecoTestToken = artifacts.require("./DecoTestToken.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })

contract("DecoBaseProjectsMarketplace", async (accounts) => {
  let base = undefined

  beforeEach(async () => {
    base = await DecoBaseProjectsMarketplace.new({from: accounts[0], gasPrice: 1})
  })

  it("should revert any incoming ETH and accept zero-txns.", async () => {
    await base.sendTransaction(
      { from: accounts[0], value: web3.utils.toWei("1") }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for any incoming ETH transaction.")
      let balance = await web3.eth.getBalance(base.address)
      expect(web3.utils.toBN(balance).toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })

    await base.sendTransaction(
      { from: accounts[10], value: 0, gasPrice: 1 }
    )
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
    await testToken.transfer(
      base.address,
      web3.utils.toBN(initialBalance),
      {from: accounts[1], gasPrice: 1}
    )
    let transferAndTest = async (sender, amount) => {
      let initialSenderBalance = await testToken.balanceOf(sender)
      let initialContractBalance = await testToken.balanceOf(base.address)
      await base.transferAnyERC20Token(
        testToken.address,
        web3.utils.toBN(amount),
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Error is expected, balance should not changed.")
        expect(sender == accounts[0] && initialBalance.gt(amount)).to.be.false
        let senderBalance = await testToken.balanceOf(sender)
        let contractBalance = await testToken.balanceOf(base.address)
        expect(senderBalance.toString()).to.be.equal(initialSenderBalance.toString())
        expect(contractBalance.toString()).to.be.equal(initialContractBalance.toString())
      }).then(async (txn) => {
        if(txn) {
          expect(sender == accounts[0] && initialBalance.gt(amount)).to.be.true
          let senderBalance = await testToken.balanceOf.call(sender)
          let contractBalance = await testToken.balanceOf.call(base.address)
          expect(senderBalance.toString()).to.be.equal(amount.plus(initialSenderBalance).toString())
          let initialContractBalanceBN = new BigNumber(initialContractBalance)
          expect(contractBalance.toString()).to.be.equal(initialContractBalanceBN.minus(amount).toString())
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
