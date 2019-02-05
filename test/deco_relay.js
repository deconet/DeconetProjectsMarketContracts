var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoEscrowStub = artifacts.require("./DecoEscrowStub.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

contract("DecoRelay", async (accounts) => {
  let decoRelay = undefined

  const GetNewContracts = async (sender, withdrawalAddress) => {
    let projectsContract = await DecoProjects.new(10, {from: sender, gasPrice: "1"})
    let milestonesContract = await DecoMilestones.new({from: sender, gasPrice: "1"})
    let arbitrationContract = await DecoArbitration.new({from: sender, gasPrice: "1"})
    let decoEscrowStub = await DecoEscrowStub.new({from: sender, gasPrice: "1"})
    let escrowFactoryContract = await DecoEscrowFactory.new(decoEscrowStub.address ,{from: sender, gasPrice: "1"})
    return [
      projectsContract.address,
      milestonesContract.address,
      arbitrationContract.address,
      escrowFactoryContract.address,
      withdrawalAddress
    ]
  }

  beforeEach(async () => {
      decoRelay = await DecoRelay.deployed()
  })

  it(
    "should correctly set addresses from owner's address.",
    async () => {
      let setAndCheck = async (params) => {
        let [decoProjects, decoMilestones, decoEscrowFactory, decoArbitration, withdrawalAddress] = params
        await decoRelay.setProjectsContract(decoProjects, {from: accounts[0], gasPrice: 1})
        await decoRelay.setMilestonesContract(decoMilestones, {from: accounts[0], gasPrice: 1})
        await decoRelay.setEscrowFactoryContract(decoEscrowFactory, {from: accounts[0], gasPrice: 1})
        await decoRelay.setArbitrationContract(decoArbitration, {from: accounts[0], gasPrice: 1})
        await decoRelay.setFeesWithdrawalAddress(withdrawalAddress, {from: accounts[0], gasPrice: 1})

        let newProjects = await decoRelay.projectsContract()
        let newMilestones = await decoRelay.milestonesContract()
        let newEscrowFactory = await decoRelay.escrowFactoryContract()
        let newArbitration = await decoRelay.arbitrationContract()
        let newWithdrawal = await decoRelay.feesWithdrawalAddress()

        expect(newProjects).to.be.equal(decoProjects)
        expect(newMilestones).to.be.equal(decoMilestones)
        expect(newEscrowFactory).to.be.equal(decoEscrowFactory)
        expect(newArbitration).to.be.equal(decoArbitration)
        expect(newWithdrawal).to.be.equal(withdrawalAddress)
      }
      await setAndCheck(await GetNewContracts(accounts[0], accounts[13]))
      await setAndCheck(await GetNewContracts(accounts[0], accounts[14]))
      await setAndCheck(await GetNewContracts(accounts[0], accounts[15]))
    }
  )

  it(
    "should fail setting addresses from not owner's address.",
    async () => {
      let setAndCheck = async (params) => {
        let [decoProjects, decoMilestones, decoEscrowFactory, decoArbitration, withdrawalAddress] = params
        await decoRelay.setProjectsContract(
          decoProjects,
          {from: accounts[2], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newProjects = await decoRelay.projectsContract()
          expect(newProjects).to.not.be.equal(decoProjects)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setMilestonesContract(
          decoMilestones,
          {from: accounts[3], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newMilestones = await decoRelay.milestonesContract()
          expect(newMilestones).to.not.be.equal(decoMilestones)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setEscrowFactoryContract(
          decoEscrowFactory,
          {from: accounts[5], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newEscrowFactory = await decoRelay.escrowFactoryContract()
          expect(newEscrowFactory).to.not.be.equal(decoEscrowFactory)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setArbitrationContract(
          decoArbitration,
          {from: accounts[5], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newArbitration = await decoRelay.arbitrationContract()
          expect(newArbitration).to.not.be.equal(decoArbitration)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setFeesWithdrawalAddress(
          withdrawalAddress,
          {from: accounts[5], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newWithdrawal = await decoRelay.feesWithdrawalAddress()
          expect(newWithdrawal).to.not.be.equal(withdrawalAddress)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }
      await setAndCheck(await GetNewContracts(accounts[3], accounts[7]))
      await setAndCheck(await GetNewContracts(accounts[4], accounts[8]))
      await setAndCheck(await GetNewContracts(accounts[5], accounts[9]))
    }
  )

  it(
    "should fail setting addresses to 0x0.",
    async () => {
      let setAndCheck = async () => {
        await decoRelay.setProjectsContract(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setMilestonesContract(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setEscrowFactoryContract(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setArbitrationContract(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setFeesWithdrawalAddress(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await setAndCheck()
      await setAndCheck()
    }
  )

  it("should set share fee.", async () => {
    let setAndCheck = async (fee) => {
      await decoRelay.setShareFee(fee, {from: accounts[0], gasPrice: 1})

      let newFee = await decoRelay.shareFee()

      expect(newFee.toString()).to.be.equal(fee)
    }

    await setAndCheck("10")
    await setAndCheck("20")
    await setAndCheck("30")
    await setAndCheck("40")
  })

  it("should fail setting share fee.", async () => {
    let setAndCheck = async (fee, sender) => {
      await decoRelay.setShareFee(fee, {from: sender, gasPrice: 1}).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let newFee = await decoRelay.shareFee.call()
        expect(newFee.toString()).to.not.be.equal(fee)
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await setAndCheck("101", accounts[0])
    await setAndCheck("20", accounts[1])
    await setAndCheck("200", accounts[0])
    await setAndCheck("50", accounts[2])
  })
})
