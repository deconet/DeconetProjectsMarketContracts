var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoEscrowFactory = artifacts.require("./DecoEscrowFactory.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")

contract("DecoRelay", async (accounts) => {
  let decoRelay = undefined

  beforeEach(async () => {
      decoRelay = await DecoRelay.deployed()
  })

  it(
    "should correctly set DecoProjects, DecoMilestones, and DecoEscrowFactory addresses from owner's address.",
    async () => {
      let setAndCheck = async (decoProjects, decoMilestones, decoEscrowFactory, decoArbitration) => {
        await decoRelay.setProjectsContractAddress(decoProjects, {from: accounts[0], gasPrice: 1})
        await decoRelay.setMilestonesContractAddress(decoMilestones, {from: accounts[0], gasPrice: 1})
        await decoRelay.setEscrowFactoryContractAddress(decoEscrowFactory, {from: accounts[0], gasPrice: 1})
        await decoRelay.setArbitrationContractAddress(decoArbitration, {from: accounts[0], gasPrice: 1})

        let newProjects = await decoRelay.projectsContractAddress.call()
        let newMilestones = await decoRelay.milestonesContractAddress.call()
        let newEscrowFactory = await decoRelay.escrowFactoryContractAddress()
        let newArbitration = await decoRelay.arbitrationContractAddress.call()

        expect(newProjects).to.be.equal(decoProjects)
        expect(newMilestones).to.be.equal(decoMilestones)
        expect(newEscrowFactory).to.be.equal(decoEscrowFactory)
        expect(newArbitration).to.be.equal(decoArbitration)
      }

      setAndCheck(accounts[1], accounts[2], accounts[3], accounts[10])
      setAndCheck(accounts[4], accounts[5], accounts[6], accounts[11])
      setAndCheck(accounts[7], accounts[8], accounts[9], accounts[12])
    }
  )

  it(
    "should fail setting DecoProjects, DecoMilestones, and DecoEscrowFactory addresses from not owner's address.",
    async () => {
      let setAndCheck = async (decoProjects, decoMilestones, decoEscrowFactory, decoArbitration) => {
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
      }

      setAndCheck(accounts[10], accounts[11], accounts[12], accounts[19])
      setAndCheck(accounts[13], accounts[14], accounts[15], accounts[20])
      setAndCheck(accounts[16], accounts[17], accounts[18], accounts[21])
    }
  )
})
