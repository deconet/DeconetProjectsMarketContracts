var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

contract("DecoRelay", async (accounts) => {
  let decoRelay = undefined

  beforeEach(async () => {
      decoRelay = await DecoRelay.deployed()
  })

  it(
    "should correctly set addresses from owner's address.",
    async () => {
      let setAndCheck = async (
        decoProjects, decoMilestones, decoEscrowFactory, decoArbitration, withdrawalAddress
      ) => {
        await decoRelay.setProjectsContractAddress(decoProjects, {from: accounts[0], gasPrice: 1})
        await decoRelay.setMilestonesContractAddress(decoMilestones, {from: accounts[0], gasPrice: 1})
        await decoRelay.setEscrowFactoryContractAddress(decoEscrowFactory, {from: accounts[0], gasPrice: 1})
        await decoRelay.setArbitrationContractAddress(decoArbitration, {from: accounts[0], gasPrice: 1})
        await decoRelay.setFeesWithdrawalAddress(withdrawalAddress, {from: accounts[0], gasPrice: 1})

        let newProjects = await decoRelay.projectsContractAddress.call()
        let newMilestones = await decoRelay.milestonesContractAddress.call()
        let newEscrowFactory = await decoRelay.escrowFactoryContractAddress()
        let newArbitration = await decoRelay.arbitrationContractAddress.call()
        let newWithdrawal = await decoRelay.feesWithdrawalAddress.call()

        expect(newProjects).to.be.equal(decoProjects)
        expect(newMilestones).to.be.equal(decoMilestones)
        expect(newEscrowFactory).to.be.equal(decoEscrowFactory)
        expect(newArbitration).to.be.equal(decoArbitration)
        expect(newWithdrawal).to.be.equal(withdrawalAddress)
      }

      await setAndCheck(accounts[1], accounts[2], accounts[3], accounts[10], accounts[13])
      await setAndCheck(accounts[4], accounts[5], accounts[6], accounts[11], accounts[14])
      await setAndCheck(accounts[7], accounts[8], accounts[9], accounts[12], accounts[15])
    }
  )

  it(
    "should fail setting addresses from not owner's address.",
    async () => {
      let setAndCheck = async (
        decoProjects, decoMilestones, decoEscrowFactory, decoArbitration, withdrawalAddress
      ) => {
        await decoRelay.setProjectsContractAddress(
          decoProjects,
          {from: accounts[2], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newProjects = await decoRelay.projectsContractAddress.call()
          expect(newProjects).to.not.be.equal(decoProjects)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setMilestonesContractAddress(
          decoMilestones,
          {from: accounts[3], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newMilestones = await decoRelay.milestonesContractAddress.call()
          expect(newMilestones).to.not.be.equal(decoMilestones)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setEscrowFactoryContractAddress(
          decoEscrowFactory,
          {from: accounts[5], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newEscrowFactory = await decoRelay.escrowFactoryContractAddress()
          expect(newEscrowFactory).to.not.be.equal(decoEscrowFactory)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setArbitrationContractAddress(
          decoArbitration,
          {from: accounts[5], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newArbitration = await decoRelay.arbitrationContractAddress.call()
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
          let newWithdrawal = await decoRelay.feesWithdrawalAddress.call()
          expect(newWithdrawal).to.not.be.equal(withdrawalAddress)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await setAndCheck(accounts[10], accounts[11], accounts[12], accounts[19], accounts[22])
      await setAndCheck(accounts[13], accounts[14], accounts[15], accounts[20], accounts[23])
      await setAndCheck(accounts[16], accounts[17], accounts[18], accounts[21], accounts[24])
    }
  )

  it(
    "should fail setting addresses to 0x0.",
    async () => {
      let setAndCheck = async (decoProjects, decoMilestones, decoEscrowFactory, decoArbitration, withdrawalAddress) => {
        await decoRelay.setProjectsContractAddress(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newProjects = await decoRelay.projectsContractAddress.call()
          expect(newProjects).to.not.be.equal(decoProjects)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setMilestonesContractAddress(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newMilestones = await decoRelay.milestonesContractAddress.call()
          expect(newMilestones).to.not.be.equal(decoMilestones)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setEscrowFactoryContractAddress(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newEscrowFactory = await decoRelay.escrowFactoryContractAddress()
          expect(newEscrowFactory).to.not.be.equal(decoEscrowFactory)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
        await decoRelay.setArbitrationContractAddress(
          ZERO_ADDRESS,
          {from: accounts[0], gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception.")
          let newArbitration = await decoRelay.arbitrationContractAddress.call()
          expect(newArbitration).to.not.be.equal(decoArbitration)
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
          let newWithdrawal = await decoRelay.feesWithdrawalAddress.call()
          expect(newWithdrawal).to.not.be.equal(withdrawalAddress)
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await setAndCheck(accounts[10], accounts[11], accounts[12], accounts[19], accounts[22])
      await setAndCheck(accounts[13], accounts[14], accounts[15], accounts[20], accounts[23])
      await setAndCheck(accounts[16], accounts[17], accounts[18], accounts[21], accounts[24])
    }
  )

  it("should set share fee.", async () => {
    let setAndCheck = async (fee) => {
      await decoRelay.setShareFee(fee, {from: accounts[0], gasPrice: 1})

      let newFee = await decoRelay.shareFee.call()

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
