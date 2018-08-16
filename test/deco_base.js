let DecoProjects = artifacts.require("./DecoProjects.sol")
let DecoMilestones = artifacts.require("./DecoMilestones.sol")

contract("DecoBaseProjectsMarketplace", async (accounts) => {

  it("should revert any incoming ETH.", async () => {
    let decoProjects = await DecoProjects.deployed()
    let decoMilestones = await DecoMilestones.deployed()
    let txn = await decoProjects.sendTransaction(
      {
        from: accounts[0],
        value: web3.toWei(1)
      }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for any incoming ETH transaction.")
      let balance = await web3.eth.getBalance(decoProjects.address)
      expect(balance.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })

    await decoMilestones.sendTransaction(
      {
        from: accounts[0],
        value: web3.toWei(1)
      }
    ).catch(async (err) => {
      assert.isOk(err, "Exception should be thrown for any incoming ETH transaction.")
      let balance = await web3.eth.getBalance(decoMilestones.address)
      expect(balance.toNumber()).to.be.equal(0)
    }).then((txn) => {
      if(txn) {
        assert.fail(txn, "Should have failed above.")
      }
    })
  })
})
