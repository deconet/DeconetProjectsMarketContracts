var BigNumber = require("bignumber.js")
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })
var DecoTestToken = artifacts.require("./DecoTestToken.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoEscrowMock = artifacts.require("./DecoEscrowMock.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

class Erc20Token {
  constructor() {
    this.contract = undefined
    this.decimals = 0
    this.totalSupply = 0
  }

  get address() { return this.contract.address }

  static async create(deployingAddress) {
    let erc20Token = new Erc20Token()
    erc20Token.contract = await DecoTestToken.new({from: deployingAddress, gasPrice: 1})
    erc20Token.decimals = await erc20Token.contract.decimals.call()
    erc20Token.totalSupply = await erc20Token.contract.totalSupply.call()
    return erc20Token
  }

  async approveAllowance(sender, to, amount) {
    return this.contract.approve(
      to,
      web3.utils.toBN(this.tokensValueAsBigNumber(amount).toString()),
      {from: sender, gasPrice: 1}
    )
  }

  async transferFrom(sender, from, to, amount) {
    return this.contract.transferFrom(
      from,
      to,
      web3.utils.toBN(this.tokensValueAsBigNumber(amount).toString()),
      {from: sender, gasPrice: 1}
    )
  }

  async transfer(sender, to, amount) {
    return this.contract.transfer(
      to,
      web3.utils.toBN(this.tokensValueAsBigNumber(amount).toString()),
      {from: sender, gasPrice: 1}
    )
  }

  async balanceOf(address) {
    return this.contract.balanceOf.call(address)
  }

  tokensValueAsBigNumber(amount) {
    let amountBigNumber = new BigNumber(amount)
    let decimalsAppendixBigNumber = (new BigNumber(10)).pow(this.decimals)
    return amountBigNumber.times(decimalsAppendixBigNumber)
  }
}


contract("DecoEscrow", async (accounts) => {
  let relay = undefined
  let shareFee = 0

  before(async () => {
    relay = await DecoRelay.deployed()
    await relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
    await relay.setFeesWithdrawalAddress(accounts[0], {from: accounts[0], gasPrice: 1})
  })

  const DeployTestTokenAndApproveAllowance = async (deployFrom, approveFrom, approveTo, amountOfTokensToApprove) => {
    let decoTestToken = await Erc20Token.create(deployFrom)
    if(deployFrom !== approveFrom) {
      await decoTestToken.transfer(deployFrom, approveFrom, amountOfTokensToApprove)
    }
    await decoTestToken.approveAllowance(approveFrom, approveTo, amountOfTokensToApprove)
    return decoTestToken
  }

  const DeployEscrowAndInit = async (deployFrom, newOwner, authorizedAddress) => {
    let escrow = await DecoEscrow.new({from: deployFrom, gasPrice: 1})
    let relayAddress = await escrow.relayContractAddress()
    await escrow.initialize(
      newOwner,
      authorizedAddress,
      shareFee,
      relay.address,
      {from: deployFrom, gasPrice: 1}
    )
    return escrow
  }

  it(
    "should accept direct payments in ETH to the contract address and correctly account incoming amount.",
    async () => {
      let decoEscrow = await DecoEscrow.deployed()
      let sendEthAndValidateBalance = async (senderAddress, amountToSendInETH, directSending) => {
        let weiValueToSend = web3.utils.toWei(amountToSendInETH)
        let initialBalance = await decoEscrow.balance.call()
        let txn
        if(directSending) {
          txn = await decoEscrow.sendTransaction({from: senderAddress, gasPrice: 1, value: weiValueToSend})
        } else {
          txn = await decoEscrow.deposit({from: senderAddress, gasPrice: 1, value: weiValueToSend})
        }
        let resultingBalance = await decoEscrow.balance.call()
        expect(resultingBalance.toString()).to.be.equal(
          new BigNumber(initialBalance).plus(weiValueToSend).toString()
        )

        let emittedEvent = txn.logs[0]
        let sentValueString = (new BigNumber(weiValueToSend)).toString()
        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(senderAddress)
        expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
        expect(emittedEvent.args.amount.toString()).to.be.equal(sentValueString)
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("0")
        expect((new BigNumber(emittedEvent.args.tokenAddress)).toString()).to.be.equal("0")
        expect(emittedEvent.args.operationType.toString()).to.be.equal("0")
      }

      await sendEthAndValidateBalance(accounts[0], "0.5", false)
      await sendEthAndValidateBalance(accounts[1], "0.6", false)
      await sendEthAndValidateBalance(accounts[2], "0.3", true)
      await sendEthAndValidateBalance(accounts[3], "0.4", true)
    }
  )

  it("should fail depositing with 0 ETH sent.", async () => {
    let decoEscrow = await DecoEscrow.deployed()
    let checkExceptionThrown = async (senderAddress, runTransaction) => {
      return runTransaction(senderAddress).catch(async (err) => {
        assert.isOk(err, "Deposit transaction with 0 ETH sent should fail.")
        expect(err.receipt.logs).to.be.empty
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    let sendEthDirectly = async (senderAddress) => {
      return decoEscrow.sendTransaction({from: senderAddress, gasPrice: 1, value: 0})
    }
    let sendEthIndirectly = async (senderAddress) => {
      return decoEscrow.deposit({from: senderAddress, gasPrice: 1, value: 0})
    }

    await checkExceptionThrown(accounts[0], sendEthDirectly)
    await checkExceptionThrown(accounts[1], sendEthDirectly)
    await checkExceptionThrown(accounts[3], sendEthDirectly)
    await checkExceptionThrown(accounts[0], sendEthIndirectly)
    await checkExceptionThrown(accounts[1], sendEthIndirectly)
    await checkExceptionThrown(accounts[3], sendEthIndirectly)
  })

  it("should fail depositing and revert on overflow error.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.setEscrowBalanceValueToAlmostMaximum()

    let checkExceptionThrown = async (senderAddress, ethAmount, runTransaction) => {
      let weiAmount = web3.utils.toWei(ethAmount)
      return runTransaction(senderAddress, weiAmount).catch(async (err) => {
        assert.isOk(err, "Deposit transaction with 0 ETH sent should fail.")
        expect(err.receipt.logs).to.be.empty
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }
    let sendEthDirectly = async (senderAddress, amount) => {
      return decoEscrowMock.sendTransaction({from: senderAddress, gasPrice: 1, value: amount})
    }
    let sendEthIndirectly = async (senderAddress, amount) => {
      return decoEscrowMock.deposit({from: senderAddress, gasPrice: 1, value: amount})
    }

    checkExceptionThrown(accounts[0], "0.1", sendEthDirectly)
    checkExceptionThrown(accounts[1], "0.15", sendEthDirectly)
    checkExceptionThrown(accounts[2], "0.2", sendEthDirectly)
    checkExceptionThrown(accounts[0], "0.1", sendEthIndirectly)
    checkExceptionThrown(accounts[1], "0.15", sendEthIndirectly)
    checkExceptionThrown(accounts[2], "0.2", sendEthIndirectly)
  })

  it(
    "should initialize contract successfully with a new owner address and authorized addresses from the original owner address.",
    async () => {
      let decoEscrow = await DecoEscrow.new({from: accounts[0], gasPrice: 1})
      let initialOwnerAddress = await decoEscrow.owner.call()
      let isAddressAuthorizedInitially = await decoEscrow.authorizedAddress.call()
      let authorizedAccount = accounts[2]
      let shareFee = await relay.shareFee.call()
      let feesWithdrawalAddress = await relay.feesWithdrawalAddress.call()
      let txn = await decoEscrow.initialize(
        accounts[1],
        authorizedAccount,
        shareFee.toString(),
        relay.address,
        {from: accounts[0], gasPrice: 1}
      )
      let newOwner = await decoEscrow.owner.call()
      expect(newOwner).to.not.be.equal(initialOwnerAddress)
      expect(newOwner).to.be.equal(accounts[1])
      let isAccountAuthoried = await decoEscrow.authorizedAddress.call()
      expect(isAddressAuthorizedInitially).to.not.be.equal(isAccountAuthoried)

      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("FundsDistributionAuthorization")
      expect(emittedEvent.args.isAuthorized).to.be.equal(true)
      expect(emittedEvent.args.targetAddress).to.be.equal(authorizedAccount)
    }
  )

  it("should fail the second initialization attempt.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
    await decoEscrow.initialize(accounts[4], accounts[6], 0, accounts[7], {from: accounts[1], gasPrice: 1})
      .catch(async (err) => {
        assert.isOk(err, "Expected to fail here.")
        let owner = await decoEscrow.owner.call()
        expect(owner).to.be.equal(accounts[1])
        let authorizedAddress = await decoEscrow.authorizedAddress.call()
        expect(authorizedAddress).to.not.be.equal(accounts[6])
    }).then(async (txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it(
    "should manage to deposit ERC20 token with correctly preconfigured allowance by sending party to contract address.",
    async () => {
      let decoTestToken = await Erc20Token.create(accounts[0])
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
      let depositErc20TokenAndCheckState = async (sender, amountToSend) => {
        let initialRealContractTokensBalance = await decoTestToken.balanceOf(decoEscrow.address)
        let initialAccountedTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        await decoTestToken.approveAllowance(
          sender,
          decoEscrow.address,
          amountToSend.times(2).toString()
        )

        let amountToWithdraw = decoTestToken.tokensValueAsBigNumber(amountToSend.toString())
        let txn = await decoEscrow.depositErc20(
          decoTestToken.address,
          amountToWithdraw.toString(),
          {from: sender, gasPrice: 1}
        )

        let realContractTokensBalance = await decoTestToken.balanceOf(decoEscrow.address)
        expect(realContractTokensBalance.toString()).to.be.equal(
          new BigNumber(initialRealContractTokensBalance).plus(amountToWithdraw).toString()
        )

        let accountedTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        expect(accountedTokensBalance.toString()).to.be.equal(
          new BigNumber(initialAccountedTokensBalance).plus(amountToWithdraw).toString()
        )

        let emittedEvent = txn.logs[0]
        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(sender)
        expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
        expect(emittedEvent.args.amount.toString()).to.be.equal(amountToWithdraw.toString())
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
        expect(emittedEvent.args.operationType.toString()).to.be.equal("0")
      }

      await depositErc20TokenAndCheckState(accounts[0], new BigNumber(13))
      await decoTestToken.transfer(accounts[0], accounts[1], "35")
      await depositErc20TokenAndCheckState(accounts[1], new BigNumber(17))
      await decoTestToken.transfer(accounts[0], accounts[2], "39")
      await depositErc20TokenAndCheckState(accounts[2], new BigNumber(19))
      await decoTestToken.transfer(accounts[0], accounts[3], "47")
      await depositErc20TokenAndCheckState(accounts[3], new BigNumber(23))
      await decoTestToken.transfer(accounts[0], accounts[4], "200003")
      await depositErc20TokenAndCheckState(accounts[4], new BigNumber(100001))
    }
  )

  it(
    "should fail depositing ERC20 token with insufucient preconfigured allowance by sending party to contract address or with insuficient balance.",
    async () => {
      let decoTestToken = await Erc20Token.create(accounts[0])
      let decoEscrow = await DecoEscrow.deployed()
      let attemptDepositingErc20TokenAndCheckException = async (sender, amountToSend, allowance) => {
        let initialRealContractTokensBalance = await decoTestToken.balanceOf(decoEscrow.address)
        let initialAccountedTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        await decoTestToken.approveAllowance(
          sender,
          decoEscrow.address,
          allowance.toString()
        )

        let amountToWithdraw = decoTestToken.tokensValueAsBigNumber(amountToSend.toString())
        await decoEscrow.depositErc20(
          decoTestToken.address,
          amountToWithdraw.toString(),
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Correctly failed here.")
          let realContractTokensBalance = await decoTestToken.balanceOf(decoEscrow.address)
          expect(realContractTokensBalance.toString()).to.be.equal(
            initialRealContractTokensBalance.toString()
          )

          let accountedTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
          expect(accountedTokensBalance.toString()).to.be.equal(
            initialAccountedTokensBalance.toString()
          )
          expect(err.receipt.logs).to.be.empty
        }).then(async (txn) => {
          if (txn) {
            assert.fail("Should have failed above.")
          }
        })
      }
      let sendingAmount = new BigNumber(13)
      await attemptDepositingErc20TokenAndCheckException(accounts[0], sendingAmount, sendingAmount.dividedBy(2))

      await decoTestToken.transfer(accounts[0], accounts[1], 35)
      sendingAmount = new BigNumber(17)
      await attemptDepositingErc20TokenAndCheckException(accounts[1], sendingAmount, sendingAmount.dividedBy(2))
      await attemptDepositingErc20TokenAndCheckException(accounts[1], sendingAmount.times(3), sendingAmount.times(3))

      await decoTestToken.transfer(accounts[0], accounts[2], 39)
      sendingAmount = new BigNumber(19)
      await attemptDepositingErc20TokenAndCheckException(accounts[2], sendingAmount, sendingAmount.dividedBy(2))
      await attemptDepositingErc20TokenAndCheckException(accounts[2], sendingAmount.times(3), sendingAmount.times(3))

      await decoTestToken.transfer(accounts[0], accounts[3], 47)
      sendingAmount = new BigNumber(23)
      await attemptDepositingErc20TokenAndCheckException(accounts[3], sendingAmount, sendingAmount.dividedBy(2))
      await attemptDepositingErc20TokenAndCheckException(accounts[3], sendingAmount.times(3), sendingAmount.times(3))

      await decoTestToken.transfer(accounts[0], accounts[4], 200003)
      sendingAmount = new BigNumber(100001)
      await attemptDepositingErc20TokenAndCheckException(accounts[4], sendingAmount, sendingAmount.dividedBy(2))
      await attemptDepositingErc20TokenAndCheckException(accounts[4], sendingAmount.times(3), sendingAmount.times(3))
    }
  )

  it("should fail depositing ERC20 tokens if provided token address is invalid.", async () => {
    let decoEscrow = await DecoEscrow.deployed()
    let depositAndCheckException = async (tokenAddress) => {
      await decoEscrow.depositErc20(
        tokenAddress,
        new BigNumber("1000000000000000000").toString(),
        {from: accounts[0], gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await depositAndCheckException(accounts[1])
    await depositAndCheckException(decoEscrow.address)
    await depositAndCheckException(ZERO_ADDRESS)
  })

  it("should allow withdraw available ETH funds for the escrow owner.", async () => {
    let decoEscrow = await DecoEscrow.deployed()
    await decoEscrow.sendTransaction({from: accounts[6], gasPrice: 1, value: web3.utils.toWei("3")})

    let withdrawAndCheckBalance = async (
      amountToWithdraw, withdrawTargetAccount, withdrawAccount
    ) => {
      let initialEscrowBalance = await decoEscrow.balance.call()
      if (withdrawAccount == undefined) {
        await decoEscrow.withdraw(amountToWithdraw.toString(), {from: withdrawTargetAccount, gasPrice: 1})
      } else {
        await decoEscrow.withdrawForAddress(
          withdrawTargetAccount, amountToWithdraw.toString(), {from: withdrawAccount, gasPrice: 1}
        )
      }
      let resultingEscrowBalance = await decoEscrow.balance.call()

      expect(amountToWithdraw.toString()).to.be.equal(
        new BigNumber(initialEscrowBalance).minus(resultingEscrowBalance).toString()
      )
    }

    await withdrawAndCheckBalance(new BigNumber(web3.utils.toWei("0.5")), accounts[0])
    await withdrawAndCheckBalance(new BigNumber(web3.utils.toWei("1")), accounts[0])
    await withdrawAndCheckBalance(new BigNumber(web3.utils.toWei("0.5")), accounts[0], accounts[12])
    await withdrawAndCheckBalance(new BigNumber(web3.utils.toWei("1")), accounts[0], accounts[13])
  })

  it("should allow withdraw available ETH funds for the account with sufficient allowance.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.sendTransaction({from: accounts[6], gasPrice: 1, value: web3.utils.toWei("3")})

    let withdrawAndCheckBalance = async (to, amountToWithdraw, withdrawAddress) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.times(1.1).toString(),
        {from: to, gasPrice: 1}
      )
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.balance.call()
      let txn
      if(withdrawAddress == undefined) {
        txn = await decoEscrowMock.withdraw(amountToWithdraw.toString(), {from: to, gasPrice: 1})
      } else {
        txn = await decoEscrowMock.withdrawForAddress(
          to, amountToWithdraw.toString(), {from: withdrawAddress, gasPrice: 1}
        )
      }
      let resultingEscrowBalance = await decoEscrowMock.balance.call()
      let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let resultingAddressBalance = await web3.eth.getBalance(to)

      expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
      expect(resultingAllowance.toString()).to.be.equal(
        new BigNumber(initialAllowance).minus(amountToWithdraw).toString()
      )
      expect(resultingAddressBalance.toString()).to.be.equal(
        amountToWithdraw
          .plus(initialAddressBalance)
          .minus(withdrawAddress == undefined ? new BigNumber(txn.receipt.gasUsed) : 0)
          .toString()
      )
    }

    await withdrawAndCheckBalance(accounts[1], new BigNumber(web3.utils.toWei("0.5")))
    await withdrawAndCheckBalance(accounts[2], new BigNumber(web3.utils.toWei("0.1")))
    await withdrawAndCheckBalance(accounts[3], new BigNumber(web3.utils.toWei("0.3")))
    await withdrawAndCheckBalance(accounts[4], new BigNumber(web3.utils.toWei("0.8")), accounts[3])
    await withdrawAndCheckBalance(accounts[5], new BigNumber(web3.utils.toWei("0.0001")), accounts[4])
  })

  it("should fail withdrawal if accounted limit aka allowance or available escrow balance is exceeded.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    let depositAmount = new BigNumber(web3.utils.toWei("1"))
    await decoEscrowMock.sendTransaction({from: accounts[9], gasPrice: 1, value: depositAmount.toString()})
    let escrowAccountedBalance = await decoEscrowMock.balance.call()
    escrowAccountedBalance = new BigNumber(escrowAccountedBalance)

    let tryWithdrawAndCheckException = async (to, amountToWithdraw, withdrawAddress) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.times(0.5).toString(),
        {from: to, gasPrice: 1}
      )
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.balance.call()
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let withdraw = async () => {
        if(withdrawAddress == undefined) {
          return await decoEscrowMock.withdraw(amountToWithdraw.toString(), {from: to, gasPrice: 1})
        } else {
          return await decoEscrowMock.withdrawForAddress(
            to, amountToWithdraw.toString(), {from: withdrawAddress, gasPrice: 1}
          )
        }
      }
      await withdraw().catch(async (err) => {
        assert.isOk(err,"Expected exception here.")
        let resultingEscrowBalance = await decoEscrowMock.balance.call()
        let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
        let resultingAddressBalance = await web3.eth.getBalance(to)

        expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
        expect(resultingAllowance.toString()).to.be.equal(initialAllowance.toString())
        expect(resultingAddressBalance.toString()).to.be.equal(
          new BigNumber(initialAddressBalance).minus(
            withdrawAddress == undefined ? new BigNumber(err.receipt.gasUsed) : 0
          ).toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await tryWithdrawAndCheckException(accounts[0], escrowAccountedBalance.plus(1000))
    await tryWithdrawAndCheckException(accounts[0], escrowAccountedBalance.plus(1000), accounts[11])
    await tryWithdrawAndCheckException(accounts[0], escrowAccountedBalance.plus(web3.utils.toWei("1")))
    await tryWithdrawAndCheckException(accounts[1], new BigNumber(web3.utils.toWei("0.04")))
    await tryWithdrawAndCheckException(accounts[2], new BigNumber(web3.utils.toWei("0.02")), accounts[1])
    await tryWithdrawAndCheckException(accounts[3], new BigNumber(web3.utils.toWei("0.05")))
    await tryWithdrawAndCheckException(accounts[4], new BigNumber(web3.utils.toWei("0.000001")), accounts[3])
  })

  it("should fail withdrawal if requested amount is greater than actual contract balance.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.setEscrowBalanceValueToAlmostMaximum()

    let tryWithdrawAndCheckException = async (to, amountToWithdraw, withdrawAddress) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      )
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.balance.call()
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let withdraw = async () => {
        if(withdrawAddress == undefined) {
          return await decoEscrowMock.withdraw(amountToWithdraw.toString(), {from: to, gasPrice: 1})
        } else {
          return await decoEscrowMock.withdrawForAddress(
            to, amountToWithdraw.toString(), {from: withdrawAddress, gasPrice: 1}
          )
        }
      }
      await withdraw().catch(async (err) => {
        assert.isOk(err,"Expected exception here.")
        let resultingEscrowBalance = await decoEscrowMock.balance.call()
        let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
        let resultingAddressBalance = await web3.eth.getBalance(to)

        expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
        expect(resultingAllowance.toString()).to.be.equal(initialAllowance.toString())
        expect(resultingAddressBalance.toString()).to.be.equal(
          new BigNumber(initialAddressBalance).minus(
            withdrawAddress == undefined ? new BigNumber(err.receipt.gasUsed) : 0
          ).toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await tryWithdrawAndCheckException(accounts[0], new BigNumber(web3.utils.toWei("1")))
    await tryWithdrawAndCheckException(accounts[0], new BigNumber(web3.utils.toWei("1")), accounts[11])
    await tryWithdrawAndCheckException(accounts[1], new BigNumber(web3.utils.toWei("0.4")))
    await tryWithdrawAndCheckException(accounts[2], new BigNumber(web3.utils.toWei("0.2")), accounts[1])
    await tryWithdrawAndCheckException(accounts[3], new BigNumber(web3.utils.toWei("0.5")))
    await tryWithdrawAndCheckException(accounts[4], new BigNumber(web3.utils.toWei("0.000001")), accounts[3])
  })

  it("should emit the event about outgoing ETH funds.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.sendTransaction({from: accounts[10], gasPrice: 1, value: web3.utils.toWei("3")})

    let withdrawAndCheckEmittedEvent = async (to, amountToWithdraw, withdrawAddress) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      )
      let txn
      if(withdrawAddress == undefined) {
        txn = await decoEscrowMock.withdraw(
          amountToWithdraw.toString(),
          {from: to, gasPrice: 1}
        )
      } else {
        txn = await decoEscrowMock.withdrawForAddress(
          to, amountToWithdraw.toString(), {from: withdrawAddress, gasPrice: 1}
        )
      }
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("FundsOperation")
      expect(emittedEvent.args.sender).to.be.equal(decoEscrowMock.address)
      expect(emittedEvent.args.target).to.be.equal(to)
      expect(emittedEvent.args.amount.toString()).to.be.equal(amountToWithdraw.toString())
      expect(emittedEvent.args.paymentType.toString()).to.be.equal("0")
      expect(emittedEvent.args.operationType.toString()).to.be.equal("1")
      expect((new BigNumber(emittedEvent.args.tokenAddress)).toString()).to.be.equal("0")
    }

    await withdrawAndCheckEmittedEvent(accounts[0], new BigNumber(web3.utils.toWei("1")))
    await withdrawAndCheckEmittedEvent(accounts[1], new BigNumber(web3.utils.toWei("0.4")))
    await withdrawAndCheckEmittedEvent(accounts[2], new BigNumber(web3.utils.toWei("0.2")))
    await withdrawAndCheckEmittedEvent(accounts[2], new BigNumber(web3.utils.toWei("0.7")), accounts[13])
    await withdrawAndCheckEmittedEvent(accounts[3], new BigNumber(web3.utils.toWei("0.5")))
    await withdrawAndCheckEmittedEvent(accounts[4], new BigNumber(web3.utils.toWei("0.000001")))
    await withdrawAndCheckEmittedEvent(accounts[7], new BigNumber(web3.utils.toWei("0.001")), accounts[14])
  })

  it(
    "should allow withdrawal of ERC20 tokens with sufficient allowance or available tokens balance.",
    async () => {
      let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrowMock.address, 10000)
      await decoEscrowMock.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(9999).toString(),
        {from: accounts[0], gasPrice: 1}
      )

      let withdrawAndCheckBalance = async (to, amountToWithdraw, withdrawAddress) => {
        await decoEscrowMock.setTokensWithdrawalAllowance(
          decoTestToken.address,
          decoTestToken.tokensValueAsBigNumber(amountToWithdraw.times(1.1).toString()).toString(),
          {from: to, gasPrice: 1}
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToWithdraw.toString())
        let initialTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
        let initialAddressTokensBalance = await decoTestToken.balanceOf(to)
        let initialAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
          to,
          decoTestToken.address
        )
        if(withdrawAddress == undefined) {
          await decoEscrowMock.withdrawErc20(
            decoTestToken.address,
            tokensAmount.toString(),
            {from: to, gasPrice: 1}
          )
        } else {
          await decoEscrowMock.withdrawErc20ForAddress(
            to,
            decoTestToken.address,
            tokensAmount.toString(),
            {from: withdrawAddress, gasPrice: 1}
          )
        }

        let resultingTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
        let resultingAddressTokensBalance = await decoTestToken.balanceOf(to)
        let resultingAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
          to,
          decoTestToken.address
        )

        if(to === accounts[0]) {
          expect(initialTokensBalance.toString()).to.be.equal(
            tokensAmount.plus(resultingTokensBalance).toString()
          )
        } else {
          expect(initialTokensBalance.toString()).to.be.equal(
            resultingTokensBalance.toString()
          )
        }
        expect(initialAddressTokensBalance.toString()).to.be.equal(
          new BigNumber(resultingAddressTokensBalance).minus(tokensAmount).toString()
        )

        if(to !== accounts[0]) {
          expect(initialAllowance.toString()).to.be.equal(
            tokensAmount.plus(resultingAllowance).toString()
          )
        } else {
          expect(initialAllowance.toString()).to.be.equal(resultingAllowance.toString())
        }
      }

      await withdrawAndCheckBalance(accounts[0], new BigNumber(10))
      await withdrawAndCheckBalance(accounts[1], new BigNumber(30), accounts[11])
      await withdrawAndCheckBalance(accounts[2], new BigNumber(400))
      await withdrawAndCheckBalance(accounts[3], new BigNumber(14), accounts[12])
      await withdrawAndCheckBalance(accounts[4], new BigNumber(0.001))
      await withdrawAndCheckBalance(accounts[5], new BigNumber(0.1), accounts[15])
    }
  )

  it(
    "should fail withdrawal of ERC20 tokens if token's withdrawal allowance for an address or contract's balance of tokens are insufficient.",
    async () => {
      let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrowMock.address, 10000)
      await decoEscrowMock.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(9999).toString(),
        {from: accounts[0], gasPrice: 1}
      )
      let tokensContractBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address)
      tokensContractBalance = new BigNumber(tokensContractBalance)

      let withdrawAndCheckException = async (to, amountToWithdraw, withdrawAddress) => {
        await decoEscrowMock.setTokensWithdrawalAllowance(
          decoTestToken.address,
          decoTestToken.tokensValueAsBigNumber(amountToWithdraw.times(0.9).toString()).toString(),
          {from: to, gasPrice: 1}
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToWithdraw.toString())
        let initialTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
        let initialAddressTokensBalance = await decoTestToken.balanceOf(to)
        let initialAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
          to,
          decoTestToken.address
        )
        let withdraw = async () => {
          if(withdrawAddress == undefined) {
            return await decoEscrowMock.withdrawErc20(
              decoTestToken.address,
              tokensAmount.toString(),
              {from: to, gasPrice: 1}
            )
          } else {
            return await decoEscrowMock.withdrawErc20ForAddress(
              to,
              decoTestToken.address,
              tokensAmount.toString(),
              {from: withdrawAddress, gasPrice: 1}
            )
          }
        }
        await withdraw().catch(async (err) => {
          assert.isOk(err, "Expected exception here.")
          let resultingTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
          let resultingAddressTokensBalance = await decoTestToken.balanceOf(to)
          let resultingAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
            to,
            decoTestToken.address
          )

          expect(initialTokensBalance.toString()).to.be.equal(
            resultingTokensBalance.toString()
          )
          expect(initialAddressTokensBalance.toString()).to.be.equal(
            resultingAddressTokensBalance.toString()
          )
          expect(initialAllowance.toString()).to.be.equal(
            resultingAllowance.toString()
          )
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await withdrawAndCheckException(accounts[0], tokensContractBalance.plus(new BigNumber(10)))
      await withdrawAndCheckException(
        accounts[0],
        tokensContractBalance.plus(new BigNumber(1)),
        accounts[10]
      )
      await withdrawAndCheckException(
        accounts[0],
        tokensContractBalance.plus(decoTestToken.tokensValueAsBigNumber(10))
      )
      await withdrawAndCheckException(accounts[1], new BigNumber(30), accounts[11])
      await withdrawAndCheckException(accounts[2], new BigNumber(400))
      await withdrawAndCheckException(accounts[3], new BigNumber(14), accounts[12])
      await withdrawAndCheckException(accounts[4], new BigNumber(0.001))
      await withdrawAndCheckException(accounts[5], new BigNumber(0.1), accounts[14])
    }
  )

  it(
    "should fail withdrawal of ERC20 tokens if requested amount is greater than contract's tokens balance in ERC20 token contract.",
    async () => {
      let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrowMock.address, 10)
      await decoEscrowMock.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(9).toString(),
        {from: accounts[0], gasPrice: 1}
      )
      await decoEscrowMock.setTokensBalanceValueToAlmostMaximum(decoTestToken.address)

      let withdrawAndCheckException = async (to, amountToWithdraw, withdrawAddress) => {
        await decoEscrowMock.setTokensWithdrawalAllowance(
          decoTestToken.address,
          decoTestToken.tokensValueAsBigNumber(amountToWithdraw.times(1.1).toString()).toString(),
          {from: to, gasPrice: 1}
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToWithdraw.toString())
        let initialTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
        let initialAddressTokensBalance = await decoTestToken.balanceOf(to)
        let initialAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
          to,
          decoTestToken.address
        )
        let withdraw = async () => {
          if(withdrawAddress == undefined) {
            return await decoEscrowMock.withdrawErc20(
              decoTestToken.address,
              tokensAmount.toString(),
              {from: to, gasPrice: 1}
            )
          } else {
            return await decoEscrowMock.withdrawErc20ForAddress(
              to,
              decoTestToken.address,
              tokensAmount.toString(),
              {from: withdrawAddress, gasPrice: 1}
            )
          }
        }
        await withdraw().catch(async (err) => {
          assert.isOk(err, "Expected exception here.")
          let resultingTokensBalance = await decoEscrowMock.tokensBalance.call(decoTestToken.address);
          let resultingAddressTokensBalance = await decoTestToken.balanceOf(to)
          let resultingAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
            to,
            decoTestToken.address
          )

          expect(initialTokensBalance.toString()).to.be.equal(
            resultingTokensBalance.toString()
          )
          expect(initialAddressTokensBalance.toString()).to.be.equal(
            resultingAddressTokensBalance.toString()
          )
          expect(initialAllowance.toString()).to.be.equal(
            resultingAllowance.toString()
          )
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await withdrawAndCheckException(accounts[0], new BigNumber(10))
      await withdrawAndCheckException(accounts[0], new BigNumber(10), accounts[10])
      await withdrawAndCheckException(accounts[1], new BigNumber(300))
      await withdrawAndCheckException(accounts[2], new BigNumber(400), accounts[10])
      await withdrawAndCheckException(accounts[3], new BigNumber(140))
      await withdrawAndCheckException(accounts[4], new BigNumber(10001), accounts[10])
      await withdrawAndCheckException(accounts[5], new BigNumber(1234))
    }
  )

  it(
    "should emit the event about outgoing ERC20 tokens payment.",
    async () => {
      let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrowMock.address, 10000)
      await decoEscrowMock.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(9999).toString(),
        {from: accounts[0], gasPrice: 1}
      )

      let withdrawAndCheckEmittedEvent = async (to, amountToWithdraw, withdrawAddress) => {
        await decoEscrowMock.setTokensWithdrawalAllowance(
          decoTestToken.address,
          decoTestToken.tokensValueAsBigNumber(amountToWithdraw.times(1.1).toString()).toString(),
          {from: to, gasPrice: 1}
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToWithdraw.toString())
        let txn
        if(withdrawAddress == undefined) {
          txn = await decoEscrowMock.withdrawErc20(
            decoTestToken.address,
            tokensAmount.toString(),
            {from: to, gasPrice: 1}
          )
        } else {
          txn = await decoEscrowMock.withdrawErc20ForAddress(
            to,
            decoTestToken.address,
            tokensAmount.toString(),
            {from: withdrawAddress, gasPrice: 1}
          )
        }

        let emittedEvent = txn.logs[0]
        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(decoEscrowMock.address)
        expect(emittedEvent.args.target).to.be.equal(to)
        expect(emittedEvent.args.amount.toString()).to.be.equal(tokensAmount.toString())
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        expect(emittedEvent.args.operationType.toString()).to.be.equal("1")
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
      }

      await withdrawAndCheckEmittedEvent(accounts[0], new BigNumber(10))
      await withdrawAndCheckEmittedEvent(accounts[0], new BigNumber(10), accounts[12])
      await withdrawAndCheckEmittedEvent(accounts[1], new BigNumber(30))
      await withdrawAndCheckEmittedEvent(accounts[2], new BigNumber(400), accounts[12])
      await withdrawAndCheckEmittedEvent(accounts[3], new BigNumber(14))
      await withdrawAndCheckEmittedEvent(accounts[4], new BigNumber(0.001), accounts[12])
      await withdrawAndCheckEmittedEvent(accounts[5], new BigNumber(0.1))
    }
  )

  it("should block funds correctly if called from authorized address.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[2])
    await decoEscrow.sendTransaction({from: accounts[13], gasPrice: 1, value: web3.utils.toWei("10")})

    let blockAndCheckState = async (sender, amountToBlock) => {
      let initialBlockedFundsAmount = await decoEscrow.blockedBalance.call()
      let initialBalance = await decoEscrow.balance.call()

      let amountInWei = web3.utils.toWei(amountToBlock.toString())
      let txn = await decoEscrow.blockFunds(amountInWei.toString(), {from: sender, gasPrice: 1})

      let resultingBlockedFundsAmount = await decoEscrow.blockedBalance.call()
      let resultingBalance = await decoEscrow.balance.call()
      expect(resultingBalance.toString()).to.be.equal(
        new BigNumber(initialBalance).minus(amountInWei).toString()
      )
      expect(resultingBlockedFundsAmount.toString()).to.be.equal(
        new BigNumber(amountInWei).plus(initialBlockedFundsAmount).toString()
      )
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("FundsOperation")
      expect(emittedEvent.args.sender).to.be.equal(decoEscrow.address)
      expect(emittedEvent.args.target).to.be.equal(sender)
      expect(emittedEvent.args.amount.toString()).to.be.equal(amountInWei.toString())
      expect(emittedEvent.args.paymentType.toString()).to.be.equal("0")
      expect(emittedEvent.args.operationType.toString()).to.be.equal("2")
      expect((new BigNumber(emittedEvent.args.tokenAddress)).toString()).to.be.equal("0")
    }

    await blockAndCheckState(accounts[2], new BigNumber(1))
    await blockAndCheckState(accounts[2], new BigNumber(3))
    await blockAndCheckState(accounts[2], new BigNumber(2))
    await blockAndCheckState(accounts[2], new BigNumber(4))

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal("0")
    expect(blockedBalance.toString()).to.be.equal(web3.utils.toWei("10").toString())
  })

  it("should fail blocking funds if called from unauthorized address.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
    await decoEscrow.sendTransaction({from: accounts[13], gasPrice: 1, value: web3.utils.toWei("10")})

    let blockAndCheckState = async (sender, amountToBlock) => {
      let initialBlockedFundsAmount = await decoEscrow.blockedBalance.call()
      let initialBalance = await decoEscrow.balance.call()

      let amountInWei = web3.utils.toWei(amountToBlock.toString())
      await decoEscrow.blockFunds(
        amountInWei.toString(), {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let resultingBlockedFundsAmount = await decoEscrow.blockedBalance.call()
        let resultingBalance = await decoEscrow.balance.call()
        expect(resultingBalance.toString()).to.be.equal(initialBalance.toString())
        expect(resultingBlockedFundsAmount.toString()).to.be.equal(
          initialBlockedFundsAmount.toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

    }

    await blockAndCheckState(accounts[0], new BigNumber(1))
    await blockAndCheckState(accounts[4], new BigNumber(3))
    await blockAndCheckState(accounts[5], new BigNumber(2))
    await blockAndCheckState(accounts[1], new BigNumber(4))

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal(web3.utils.toWei("10").toString())
    expect(blockedBalance.toString()).to.be.equal("0")
  })

  it("should fail blocking if there are not enough funds.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[2])
    await decoEscrow.sendTransaction({from: accounts[13], gasPrice: 1, value: web3.utils.toWei("10")})

    let blockAndCheckState = async (sender, amountToBlock) => {
      let initialBlockedFundsAmount = await decoEscrow.blockedBalance.call()
      let initialBalance = await decoEscrow.balance.call()

      let amountInWei = web3.utils.toWei(amountToBlock.toString())
      await decoEscrow.blockFunds(
        amountInWei.toString(), {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected crash.")
        let resultingBlockedFundsAmount = await decoEscrow.blockedBalance.call()
        let resultingBalance = await decoEscrow.balance.call()
        expect(resultingBalance.toString()).to.be.equal(initialBalance.toString())
        expect(resultingBlockedFundsAmount.toString()).to.be.equal(
          initialBlockedFundsAmount.toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })

    }

    await blockAndCheckState(accounts[2], new BigNumber(11))
    await blockAndCheckState(accounts[2], new BigNumber(10.00001))
    await blockAndCheckState(accounts[2], new BigNumber(21))
    await blockAndCheckState(accounts[2], new BigNumber(43))

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal(web3.utils.toWei("10").toString())
    expect(blockedBalance.toString()).to.be.equal("0")
  })

  it("should unblock funds if called from authorized address and there is enough blocked ether.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
    let weiBalance = web3.utils.toWei("10")
    await decoEscrow.sendTransaction({from: accounts[13], gasPrice: 1, value: weiBalance})
    await decoEscrow.blockFunds(weiBalance, {from: accounts[3], gasPrice: 1})

    let unblockAndCheckState = async (sender, amountToUnblock) => {
      let initialBalance = await decoEscrow.balance.call()
      let initialBlockedBalance = await decoEscrow.blockedBalance.call()

      let amountInWei = web3.utils.toWei(amountToUnblock.toString())
      let txn = await decoEscrow.unblockFunds(amountInWei.toString(), {from: sender, gasPrice: 1})

      let resultingBalance = await decoEscrow.balance.call()
      let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
      expect(resultingBalance.toString()).to.be.equal(
        new BigNumber(initialBalance).plus(amountInWei).toString()
      )
      expect(resultingBlockedBalance.toString()).to.be.equal(
        new BigNumber(initialBlockedBalance).minus(amountInWei).toString()
      )
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("FundsOperation")
      expect(emittedEvent.args.sender).to.be.equal(sender)
      expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
      expect(emittedEvent.args.amount.toString()).to.be.equal(amountInWei.toString())
      expect(emittedEvent.args.paymentType.toString()).to.be.equal("0")
      expect(emittedEvent.args.operationType.toString()).to.be.equal("3")
      expect((new BigNumber(emittedEvent.args.tokenAddress)).toString()).to.be.equal("0")
    }

    await unblockAndCheckState(accounts[3], new BigNumber(1))
    await unblockAndCheckState(accounts[3], new BigNumber(3))
    await unblockAndCheckState(accounts[3], new BigNumber(2))
    await unblockAndCheckState(accounts[3], new BigNumber(4))

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal(weiBalance.toString())
    expect(blockedBalance.toString()).to.be.equal("0")
  })

  it("should fail unblocking if called from unauthorized address.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[2])
    let weiBalance = web3.utils.toWei("1")
    await decoEscrow.sendTransaction({from: accounts[0], gasPrice: 1, value: weiBalance})
    await decoEscrow.blockFunds(weiBalance, {from: accounts[2], gasPrice: 1})

    let unblockAndCheckState = async (sender) => {
      let initialBalance = await decoEscrow.balance.call()
      let initialBlockedBalance = await decoEscrow.blockedBalance.call()

      let amountInWei = web3.utils.toWei("1")
      await decoEscrow.unblockFunds(
        amountInWei,
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let resultingBalance = await decoEscrow.balance.call()
        let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
        expect(resultingBalance.toString()).to.be.equal(initialBalance.toString())
        expect(resultingBlockedBalance.toString()).to.be.equal(initialBlockedBalance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have faild above.")
        }
      })
    }
    await unblockAndCheckState(accounts[0])
    await unblockAndCheckState(accounts[4])
    await unblockAndCheckState(accounts[5])
    await unblockAndCheckState(accounts[6])

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal("0")
    expect(blockedBalance.toString()).to.be.equal(weiBalance)
  })

  it("should fail unblocking if amount for being unblocked is greater than blocked in escrow.", async () => {
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
    let weiBalance = web3.utils.toWei("1")
    await decoEscrow.sendTransaction({from: accounts[0], gasPrice: 1, value: weiBalance})
    let initialContractBalance = await decoEscrow.balance.call()
    await decoEscrow.blockFunds(initialContractBalance.toString(), {from: accounts[3], gasPrice: 1})

    let unblockAndCheckState = async (sender, amount) => {
      let initialBalance = await decoEscrow.balance.call()
      let initialBlockedBalance = await decoEscrow.blockedBalance.call()

      let amountInWei = web3.utils.toWei(amount.toString())
      await decoEscrow.unblockFunds(
        amountInWei.toString(),
        {from: sender, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
        let resultingBalance = await decoEscrow.balance.call()
        let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
        expect(resultingBalance.toString()).to.be.equal(initialBalance.toString())
        expect(resultingBlockedBalance.toString()).to.be.equal(initialBlockedBalance.toString())
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have faild above.")
        }
      })
    }
    await unblockAndCheckState(accounts[3], new BigNumber(1.1))
    await unblockAndCheckState(accounts[3], new BigNumber(9.1))
    await unblockAndCheckState(accounts[3], new BigNumber(6.1))
    await unblockAndCheckState(accounts[3], new BigNumber(1.9999))

    let balance = await decoEscrow.balance.call()
    let blockedBalance = await decoEscrow.blockedBalance.call()
    expect(balance.toString()).to.be.equal("0")
    expect(blockedBalance.toString()).to.be.equal(initialContractBalance.toString())
  })

  it(
    "should block token funds when called from authorized address and there is sufficient contract balance.",
    async () => {
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[2])
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[0], gasPrice: 1}
      )

      let blockAndCheckState = async (sender, amountToBlock) => {
        let initialBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let initialTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToBlock.toString())
        let txn = await decoEscrow.blockTokenFunds(
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        )

        let resultingBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        expect(resultingBlockedTokensAmount.toString()).to.be.equal(
          tokensAmount.plus(initialBlockedTokensAmount).toString()
        )
        expect(resultingTokensBalance.toString()).to.be.equal(
          new BigNumber(initialTokensBalance).minus(tokensAmount).toString()
        )

        let emittedEvent = txn.logs[0]
        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(decoEscrow.address)
        expect(emittedEvent.args.target).to.be.equal(sender)
        expect(emittedEvent.args.amount.toString()).to.be.equal(tokensAmount.toString())
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        expect(emittedEvent.args.operationType.toString()).to.be.equal("2")
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
      }

      await blockAndCheckState(accounts[2], new BigNumber(1000))
      await blockAndCheckState(accounts[2], new BigNumber(1009))
      await blockAndCheckState(accounts[2], new BigNumber(3999))
      await blockAndCheckState(accounts[2], new BigNumber(2999))


      let blockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

      expect(blockedTokensAmount.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(new BigNumber(1000 + 1009 + 3999 + 2999).toString()).toString()
      )
      expect(tokensBalance.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(
          new BigNumber(10000 - (1000 + 1009 + 3999 + 2999)).toString()
        ).toString()
      )

      expect(blockedTokensAmount.add(tokensBalance).toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(10000).toString()
      )
  })

  it(
    "should fail blocking token funds when called from unauthorized address or tokens balance is insufficient.",
    async () => {
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[0], gasPrice: 1}
      )

      let blockAndCheckState = async (sender, amountToBlock) => {
        let initialBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let initialTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToBlock.toString())
        let txn = await decoEscrow.blockTokenFunds(
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          let resultingBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
          let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
          expect(resultingBlockedTokensAmount.toString()).to.be.equal(
            initialBlockedTokensAmount.toString()
          )
          expect(resultingTokensBalance.toString()).to.be.equal(
            initialTokensBalance.toString()
          )
          expect(err.receipt.logs).to.be.empty
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await blockAndCheckState(accounts[5], new BigNumber(1000))
      await blockAndCheckState(accounts[6], new BigNumber(1009))
      await blockAndCheckState(accounts[7], new BigNumber(3999))
      await blockAndCheckState(accounts[10], new BigNumber(2999))
      await blockAndCheckState(accounts[3], new BigNumber(10100))
      await blockAndCheckState(accounts[3], new BigNumber(10090))
      await blockAndCheckState(accounts[3], new BigNumber(39990))
      await blockAndCheckState(accounts[3], new BigNumber(29990))
      await blockAndCheckState(accounts[7], new BigNumber(9999))
      await blockAndCheckState(accounts[10], new BigNumber(1999))


      let blockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

      expect(tokensBalance.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(new BigNumber(10000).toString()).toString()
      )
      expect(blockedTokensAmount.toString()).to.be.equal("0")

      expect(blockedTokensAmount.add(tokensBalance).toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(10000).toString()
      )
  })

  it(
    "should unblock token funds when called from authorized address and there is sufficient blocked balance.",
    async () => {
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[2])
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[0], gasPrice: 1}
      )
      await decoEscrow.blockTokenFunds(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[2], gasPrice: 1}
      )


      let unblockAndCheckState = async (sender, amountToUnblock) => {
        let initialBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let initialTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToUnblock.toString())
        let txn = await decoEscrow.unblockTokenFunds(
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        )

        let resultingBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        expect(resultingBlockedTokensAmount.toString()).to.be.equal(
          new BigNumber(initialBlockedTokensAmount).minus(tokensAmount).toString()
        )
        expect(resultingTokensBalance.toString()).to.be.equal(
          new BigNumber(initialTokensBalance).plus(tokensAmount).toString()
        )

        let emittedEvent = txn.logs[0]
        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(sender)
        expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
        expect(emittedEvent.args.amount.toString()).to.be.equal(tokensAmount.toString())
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        expect(emittedEvent.args.operationType.toString()).to.be.equal("3")
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
      }

      await unblockAndCheckState(accounts[2], new BigNumber(1000))
      await unblockAndCheckState(accounts[2], new BigNumber(1009))
      await unblockAndCheckState(accounts[2], new BigNumber(3999))
      await unblockAndCheckState(accounts[2], new BigNumber(2999))


      let blockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

      expect(blockedTokensAmount.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(new BigNumber(10000 - (1000 + 1009 + 3999 + 2999)).toString()).toString()
      )
      expect(tokensBalance.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(
          new BigNumber(1000 + 1009 + 3999 + 2999).toString()
        ).toString()
      )

      expect(blockedTokensAmount.add(tokensBalance).toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(10000).toString()
      )
  })

  it(
    "should fail unblocking token funds when called from unauthorized address or blocked tokens balance is insufficient.",
    async () => {
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], accounts[3])
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[0], gasPrice: 1}
      )
      await decoEscrow.blockTokenFunds(
        decoTestToken.address,
        decoTestToken.tokensValueAsBigNumber(10000).toString(),
        {from: accounts[3], gasPrice: 1}
      )

      let unblockAndCheckState = async (sender, amountToUnblock) => {
        let initialBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let initialTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amountToUnblock.toString())
        let txn = await decoEscrow.unblockTokenFunds(
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          let resultingBlockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
          let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
          expect(resultingBlockedTokensAmount.toString()).to.be.equal(
            initialBlockedTokensAmount.toString()
          )
          expect(resultingTokensBalance.toString()).to.be.equal(
            initialTokensBalance.toString()
          )
          expect(err.receipt.logs).to.be.empty
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }

      await unblockAndCheckState(accounts[5], new BigNumber(1000))
      await unblockAndCheckState(accounts[6], new BigNumber(1009))
      await unblockAndCheckState(accounts[7], new BigNumber(3999))
      await unblockAndCheckState(accounts[10], new BigNumber(2999))
      await unblockAndCheckState(accounts[3], new BigNumber(10100))
      await unblockAndCheckState(accounts[3], new BigNumber(10090))
      await unblockAndCheckState(accounts[3], new BigNumber(39990))
      await unblockAndCheckState(accounts[3], new BigNumber(29990))
      await unblockAndCheckState(accounts[7], new BigNumber(9999))
      await unblockAndCheckState(accounts[10], new BigNumber(1999))


      let blockedTokensAmount = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)

      expect(blockedTokensAmount.toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(new BigNumber(10000).toString()).toString()
      )
      expect(tokensBalance.toString()).to.be.equal("0")

      expect(blockedTokensAmount.add(tokensBalance).toString()).to.be.equal(
        decoTestToken.tokensValueAsBigNumber(10000).toString()
      )
  })

  it(
    "should distribute funds correctly if blocked balance is sufficient and if called from authorized address",
    async () => {
      let authorizedAddress = accounts[4]
      shareFee = 3
      let withdrawalAddress = accounts[15]
      relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
      relay.setFeesWithdrawalAddress(withdrawalAddress, {from: accounts[0], gasPrice: 1})
      relay = {address: ZERO_ADDRESS }
      withdrawalAddress = ZERO_ADDRESS
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], authorizedAddress)
      let startingBalance = new BigNumber(web3.utils.toWei("10"))
      await decoEscrow.sendTransaction({from: accounts[11], value: startingBalance.toString(), gasPrice: 1})
      await decoEscrow.blockFunds(startingBalance.toString(), {from: authorizedAddress, gasPrice: 1})

      let expecteFinalBlockedBalance = startingBalance
      let distributeAndCheckState = async (sender, targetAddress, targetAddressAmount) => {
        let blockedBalance = await decoEscrow.blockedBalance.call()
        let balance = await decoEscrow.balance.call()
        let allowancesForTargetAddress = await decoEscrow.withdrawalAllowanceForAddress.call(targetAddress)
        let allowanceForFeeWithdrawalAddress = await decoEscrow.withdrawalAllowanceForAddress.call(
          withdrawalAddress
        )

        let amountInWei = web3.utils.toWei(targetAddressAmount.toString())
        let txn = await decoEscrow.distributeFunds(
          targetAddress,
          amountInWei.toString(),
          {from: sender, gasPrice: 1}
        )
        expecteFinalBlockedBalance = expecteFinalBlockedBalance.minus(amountInWei)
        let expectedFeeAmount = Math.floor(
          new BigNumber(amountInWei).times(shareFee).div(100).toString()
        )
        if(shareFee == 0 || withdrawalAddress == ZERO_ADDRESS) {
          expectedFeeAmount = 0
        }

        let resultingAllowanceForTargetAddress = await decoEscrow.withdrawalAllowanceForAddress.call(
          targetAddress
        )
        let resultingFeeAddressAllowance = await decoEscrow.withdrawalAllowanceForAddress.call(
          withdrawalAddress
        )
        let resultingBalance = await decoEscrow.balance.call()
        let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
        let emittedEvent = txn.logs[shareFee > 0 && withdrawalAddress != ZERO_ADDRESS ? 1 : 0]
        if(targetAddress == accounts[1]) {
          expect(resultingBalance.toString()).to.be.equal(
            new BigNumber(balance).plus(amountInWei).minus(expectedFeeAmount).toString()
          )
          expect(emittedEvent.args.operationType.toString()).to.be.equal("3")
        } else {
          let expectedAllowance = new BigNumber(allowancesForTargetAddress).plus(amountInWei).minus(expectedFeeAmount)
          expect(resultingAllowanceForTargetAddress.toString()).to.be.equal(expectedAllowance.toString())
          expect(emittedEvent.args.operationType.toString()).to.be.equal("4")
        }
        expect(resultingBlockedBalance.toString()).to.be.equal(
          new BigNumber(blockedBalance).minus(amountInWei).toString()
        )

        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(sender)
        if(targetAddress == accounts[1]) {
          expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
        } else {
          expect(emittedEvent.args.target).to.be.equal(targetAddress)
        }
        expect(emittedEvent.args.amount.toString()).to.be.equal(
          new BigNumber(amountInWei).minus(expectedFeeAmount).toString()
        )
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("0")
        expect((new BigNumber(emittedEvent.args.tokenAddress)).toString()).to.be.equal("0")

        if(shareFee > 0 && withdrawalAddress != ZERO_ADDRESS) {
          emittedEvent = txn.logs[0]
          expect(emittedEvent.args.operationType.toString()).to.be.equal("4")
          expect(resultingFeeAddressAllowance.toString()).to.be.equal(
            new BigNumber(allowanceForFeeWithdrawalAddress).plus(expectedFeeAmount).toString()
          )
          expect(emittedEvent.event).to.be.equal("FundsOperation")
          expect(emittedEvent.args.sender).to.be.equal(sender)
          expect(emittedEvent.args.target).to.be.equal(withdrawalAddress)
        }
      }

      await distributeAndCheckState(authorizedAddress, accounts[7], new BigNumber(1))
      relay = await DecoRelay.deployed()
      await decoEscrow.setRelayContractAddress(relay.address, {from: accounts[1], gasPrice: 1})
      withdrawalAddress = accounts[15]
      await distributeAndCheckState(authorizedAddress, accounts[9], new BigNumber(1.2))
      await distributeAndCheckState(authorizedAddress, accounts[0], new BigNumber(0.1))
      await distributeAndCheckState(authorizedAddress, accounts[1], new BigNumber(1.1))
      let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
      expect(resultingBlockedBalance.toString()).to.be.equal(
        expecteFinalBlockedBalance.toString()
      )
    }
  )

  it(
    "should fail distributing funds if called from unauthorized address or blocked balance is insufficient.",
    async () => {
      let authorizedAddress = accounts[3]
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], authorizedAddress)
      let startingBalance = new BigNumber(web3.utils.toWei("2"))
      await decoEscrow.sendTransaction({from: accounts[11], value: startingBalance.toString(), gasPrice: 1})
      await decoEscrow.blockFunds(startingBalance.toString(), {from: authorizedAddress, gasPrice: 1})

      let distributeAndCheckState = async (sender, targetAddress, targetAddressAmount) => {
        let blockedBalance = await decoEscrow.blockedBalance.call()
        let balance = await decoEscrow.balance.call()
        let allowancesForTargetAddress = await decoEscrow.withdrawalAllowanceForAddress.call(targetAddress)
        let amountInWei = web3.utils.toWei(targetAddressAmount.toString())
        await decoEscrow.distributeFunds(
          targetAddress,
          amountInWei.toString(),
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected exception here.")
          expect(err.receipt.logs).to.be.empty
          let resultingAllowanceForTargetAddress = await decoEscrow.withdrawalAllowanceForAddress.call(
            targetAddress
          )
          let resultingBalance = await decoEscrow.balance.call()
          let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
          expect(resultingBalance.toString()).to.be.equal(balance.toString())
          expect(resultingAllowanceForTargetAddress.toString()).to.be.equal(
            allowancesForTargetAddress.toString()
          )
          expect(resultingBlockedBalance.toString()).to.be.equal(
            blockedBalance.toString()
          )
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })
      }
      await distributeAndCheckState(accounts[1], accounts[7], new BigNumber(1))
      await distributeAndCheckState(accounts[5], accounts[9], new BigNumber(1.2))
      await distributeAndCheckState(accounts[6], accounts[0], new BigNumber(1.1))
      await distributeAndCheckState(authorizedAddress, accounts[7], new BigNumber(8))
      await distributeAndCheckState(authorizedAddress, accounts[9], new BigNumber(4.2))
      await distributeAndCheckState(authorizedAddress, accounts[0], new BigNumber(10.1))
      let resultingBlockedBalance = await decoEscrow.blockedBalance.call()
      expect(resultingBlockedBalance.toString()).to.be.equal(
        startingBalance.toString()
      )
    }
  )

  it(
    "should distribute token funds when called from authorized address and there is sufficient blocked balance.",
    async () => {
      let authorizedAddress = accounts[3]
      shareFee = 3
      let withdrawalAddress = accounts[16]
      relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
      relay.setFeesWithdrawalAddress(withdrawalAddress, {from: accounts[0], gasPrice: 1})
      relay = {address: ZERO_ADDRESS}
      withdrawalAddress = ZERO_ADDRESS
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], authorizedAddress)
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      let initialTokensBalance = decoTestToken.tokensValueAsBigNumber(10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        initialTokensBalance.toString(),
        {from: accounts[0], gasPrice: 1}
      )
      await decoEscrow.blockTokenFunds(
        decoTestToken.address,
        initialTokensBalance.toString(),
        {from: authorizedAddress, gasPrice: 1}
      )

      let expectedFinalBlockedTokensBalance = initialTokensBalance
      let distributeAndCheckState = async (sender, targetAddress, amount) => {
        let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        let blockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let tokensBeforeAllowance = await decoEscrow.getTokenWithdrawalAllowance(
          targetAddress,
          decoTestToken.address
        )
        let feeAddressAllowance = await decoEscrow.getTokenWithdrawalAllowance(
          withdrawalAddress,
          decoTestToken.address
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amount.toString())
        let txn = await decoEscrow.distributeTokenFunds(
          targetAddress,
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        )
        expectedFinalBlockedTokensBalance = expectedFinalBlockedTokensBalance.minus(tokensAmount)
        let expectedFeeAmount = Math.floor(
          new BigNumber(tokensAmount).times(shareFee).div(100).toString()
        )
        if(shareFee == 0 || withdrawalAddress == ZERO_ADDRESS) {
          expectedFeeAmount = 0
        }

        let resultingTokensAllowanceForTargetAddress = await decoEscrow.getTokenWithdrawalAllowance(
          targetAddress,
          decoTestToken.address
        )
        let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        let resultingBlockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let resultingFeeAddressAllowance = await decoEscrow.getTokenWithdrawalAllowance(
          withdrawalAddress,
          decoTestToken.address
        )
        let emittedEvent = txn.logs[shareFee > 0 && withdrawalAddress != ZERO_ADDRESS ? 1 : 0]
        if(targetAddress == accounts[1]) {
          expect(resultingTokensBalance.toString()).to.be.equal(
            new BigNumber(tokensBalance).plus(tokensAmount).minus(expectedFeeAmount).toString()
          )
          expect(emittedEvent.args.operationType.toString()).to.be.equal("3")
        } else {
          let expectedAllowance = new BigNumber(tokensBeforeAllowance).plus(tokensAmount).minus(expectedFeeAmount)
          expect(resultingTokensAllowanceForTargetAddress.toString()).to.be.equal(
            expectedAllowance.toString()
          )
          expect(emittedEvent.args.operationType.toString()).to.be.equal("4")
        }
        expect(resultingBlockedTokensBalance.toString()).to.be.equal(
          new BigNumber(blockedTokensBalance).minus(tokensAmount).toString()
        )

        expect(emittedEvent.event).to.be.equal("FundsOperation")
        expect(emittedEvent.args.sender).to.be.equal(sender)
        if(targetAddress == accounts[1]) {
          expect(emittedEvent.args.target).to.be.equal(decoEscrow.address)
        } else {
          expect(emittedEvent.args.target).to.be.equal(targetAddress)
        }
        expect(emittedEvent.args.amount.toString()).to.be.equal(
          new BigNumber(tokensAmount).minus(expectedFeeAmount).toString()
        )
        expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)

        if(shareFee > 0 && withdrawalAddress != ZERO_ADDRESS) {
          emittedEvent = txn.logs[0]
          expect(emittedEvent.args.operationType.toString()).to.be.equal("4")
          expect(resultingFeeAddressAllowance.toString()).to.be.equal(
            new BigNumber(feeAddressAllowance).plus(expectedFeeAmount).toString()
          )
          expect(emittedEvent.event).to.be.equal("FundsOperation")
          expect(emittedEvent.args.sender).to.be.equal(sender)
          expect(emittedEvent.args.target).to.be.equal(withdrawalAddress)
          expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
          expect(emittedEvent.args.paymentType.toString()).to.be.equal("1")
        }
      }

      await distributeAndCheckState(authorizedAddress, accounts[7], new BigNumber(100))
      relay = await DecoRelay.deployed()
      withdrawalAddress = accounts[16]
      await decoEscrow.setRelayContractAddress(relay.address, {from: accounts[1], gasPrice: 1})
      await distributeAndCheckState(authorizedAddress, accounts[9], new BigNumber(1999.2))
      await distributeAndCheckState(authorizedAddress, accounts[0], new BigNumber(3340.1))
      await distributeAndCheckState(authorizedAddress, accounts[1], new BigNumber(1.1))

      let resultingBlockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      expect(resultingBlockedTokensBalance.toString()).to.be.equal(
        expectedFinalBlockedTokensBalance.toString()
      )
    }
  )

  it(
    "should fail distributing token funds when called from unauthorized address or there is insufficient blocked balance.",
    async () => {
      let authorizedAddress = accounts[19]
      let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], authorizedAddress)
      let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
      let initialTokensBalance = decoTestToken.tokensValueAsBigNumber(10000)
      await decoEscrow.depositErc20(
        decoTestToken.address,
        initialTokensBalance.toString(),
        {from: accounts[0], gasPrice: 1}
      )
      await decoEscrow.blockTokenFunds(
        decoTestToken.address,
        initialTokensBalance.toString(),
        {from: authorizedAddress, gasPrice: 1}
      )

      let expectedFinalBlockedTokensBalance = initialTokensBalance
      let distributeAndCheckState = async (sender, targetAddress, amount) => {
        let tokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
        let blockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
        let tokensBeforeAllowance = await decoEscrow.getTokenWithdrawalAllowance(
          targetAddress,
          decoTestToken.address
        )

        let tokensAmount = decoTestToken.tokensValueAsBigNumber(amount.toString())
        await decoEscrow.distributeTokenFunds(
          targetAddress,
          decoTestToken.address,
          tokensAmount.toString(),
          {from: sender, gasPrice: 1}
        ).catch(async (err) => {
          assert.isOk(err, "Expected crash.")
          expect(err.receipt.logs).to.be.empty
          let resultingTokensAllowanceForTargetAddress = await decoEscrow.getTokenWithdrawalAllowance(
            targetAddress,
            decoTestToken.address
          )
          let resultingTokensBalance = await decoEscrow.tokensBalance.call(decoTestToken.address)
          let resultingBlockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)

          expect(resultingTokensBalance.toString()).to.be.equal(
            tokensBalance.toString()
          )
          expect(resultingTokensAllowanceForTargetAddress.toString()).to.be.equal(
            tokensBeforeAllowance.toString()
          )
          expect(resultingBlockedTokensBalance.toString()).to.be.equal(
            blockedTokensBalance.toString()
          )
        }).then(async (txn) => {
          if(txn) {
            assert.fail("Should have failed above.")
          }
        })

      }

      await distributeAndCheckState(accounts[1], accounts[7], new BigNumber(100))
      await distributeAndCheckState(accounts[0], accounts[9], new BigNumber(1999.2))
      await distributeAndCheckState(accounts[9], accounts[0], new BigNumber(3340.1))
      await distributeAndCheckState(authorizedAddress, accounts[5], new BigNumber(110000))
      await distributeAndCheckState(authorizedAddress, accounts[8], new BigNumber(19999.2))
      await distributeAndCheckState(authorizedAddress, accounts[6], new BigNumber(13340.1))

      let resultingBlockedTokensBalance = await decoEscrow.blockedTokensBalance.call(decoTestToken.address)
      expect(resultingBlockedTokensBalance.toString()).to.be.equal(
        expectedFinalBlockedTokensBalance.toString()
      )
    }
  )

  it("should return correct allowance for a token withdrawal for an address.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    let decoTestToken = await Erc20Token.create(accounts[0])

    let setAllowanceAndCheckState = async (sender, amount) => {
      await decoEscrowMock.setTokensBalanceValueToAlmostMaximum(decoTestToken.address, {from: sender, gasPrice: 1})
      await decoEscrowMock.setTokensWithdrawalAllowance(decoTestToken.address, amount, {from: sender, gasPrice: 1})
      let resultingTokensWithdrawalAllowance = await decoEscrowMock.getTokenWithdrawalAllowance(
        sender,
        decoTestToken.address
      )
      expect(resultingTokensWithdrawalAllowance.toString()).to.be.equal(amount.toString())
    }

    await setAllowanceAndCheckState(accounts[10], 1)
    await setAllowanceAndCheckState(accounts[11], 2)
    await setAllowanceAndCheckState(accounts[12], 3)
    await setAllowanceAndCheckState(accounts[13], 4)
    await setAllowanceAndCheckState(accounts[14], 5)
  })

  it("should not change ERC20 tokens balance with transferAnyErc20Token function.", async () => {
    let authorizedAddress = accounts[19]
    let decoEscrow = await DeployEscrowAndInit(accounts[0], accounts[1], authorizedAddress)
    let decoTestToken = await DeployTestTokenAndApproveAllowance(accounts[0], accounts[0], decoEscrow.address, 10000)
    let initialTokensBalance = decoTestToken.tokensValueAsBigNumber(10000)
    await decoEscrow.depositErc20(
      decoTestToken.address,
      initialTokensBalance.toString(),
      {from: accounts[0], gasPrice: 1}
    )

    let transferAndCheck = async (sender, amount) => {
      await decoEscrow.transferAnyERC20Token(
        decoTestToken.address,
        amount.toString(),
        {from: accounts[1], gasPrice: 1}
      ).catch(async (err) => {
        let actualBalance = await decoTestToken.balanceOf(decoEscrow.address)
        expect(actualBalance.toString()).to.be.equal(initialTokensBalance.toString())
      }).then(async (txn) => {
        if(txn) {
          let actualBalance = await decoTestToken.balanceOf(decoEscrow.address)
          expect(actualBalance.toString()).to.be.equal(initialTokensBalance.toString())
        }
      })
    }

    await transferAndCheck(accounts[1], initialTokensBalance)
    await transferAndCheck(accounts[0], initialTokensBalance.div(10))
    await transferAndCheck(accounts[5], initialTokensBalance.div(2))
  })

  it("should sync real ERC20 token balance to the storage correctly.", async () => {
    let escrowOwner = accounts[3]
    let tokenHolder = accounts[1]
    let authorizedAddress = accounts[2]
    shareFee = 5 // %
    await relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
    let escrow = await DeployEscrowAndInit(
      accounts[0],
      escrowOwner, // new owner of escrow
      authorizedAddress
    )
    let token = await DeployTestTokenAndApproveAllowance(
      accounts[0], // owner of a token and all initial funds
      tokenHolder, // allowance increased for this address
      escrow.address,
      10000
    )

    const GetBalanceInfo = async () => {
      return {
        real: new BigNumber(await token.balanceOf(escrow.address)),
        stored: new BigNumber(await escrow.contractTokensBalance(token.address))
      }
    }

    let amountToDeposit = "10"
    let fullAmountToDeposit = token.tokensValueAsBigNumber(amountToDeposit)
    let beforeBalance = await GetBalanceInfo()
    await token.transfer(
      tokenHolder,
      escrow.address,
      amountToDeposit
    )
    let afterBalance = await GetBalanceInfo()
    expect(afterBalance.real.toString()).to.be.equal(
      fullAmountToDeposit.plus(beforeBalance.real).toString()
    )
    expect(afterBalance.stored.toString()).to.be.equal(beforeBalance.stored.toString())

    beforeBalance = await GetBalanceInfo()

    await escrow.syncTokenBalance(token.address)

    afterBalance = await GetBalanceInfo()

    expect(afterBalance.real.toString()).to.be.equal(beforeBalance.real.toString())
    expect(afterBalance.stored.toString()).to.be.equal(
      fullAmountToDeposit.plus(beforeBalance.stored).toString()
    )

    amountToDeposit = "93"
    fullAmountToDeposit = token.tokensValueAsBigNumber(amountToDeposit)
    beforeBalance = await GetBalanceInfo()
    await escrow.depositErc20(
      token.address,
      fullAmountToDeposit.toString(),
      {from: tokenHolder, gasPrice: 1}
    )
    afterBalance = await GetBalanceInfo()

    expect(afterBalance.real.toString()).to.be.equal(
      fullAmountToDeposit.plus(beforeBalance.real).toString()
    )
    expect(afterBalance.stored.toString()).to.be.equal(
      fullAmountToDeposit.plus(beforeBalance.stored).toString()
    )

    let amountToDistribute = "33"
    let fullAmountToDistribute = token.tokensValueAsBigNumber(amountToDistribute)
    let testTargetAccount = accounts[10]
    beforeBalance = await GetBalanceInfo()
    await escrow.blockTokenFunds(
      token.address,
      fullAmountToDistribute.toString(),
      {from: authorizedAddress, gasPrice: 1}
    )
    await escrow.distributeTokenFunds(
      testTargetAccount,
      token.address,
      fullAmountToDistribute.toString(),
      {from: authorizedAddress, gasPrice: 1}
    )
    afterBalance = await GetBalanceInfo()

    expect(afterBalance.real.toString()).to.be.equal(beforeBalance.real.toString())
    expect(afterBalance.stored.toString()).to.be.equal(beforeBalance.stored.toString())

    let expectedUserAllowance = fullAmountToDistribute.div(100).times(100 - shareFee)

    await escrow.withdrawErc20ForAddress(
      testTargetAccount,
      token.address,
      expectedUserAllowance.toString(),
      {from: tokenHolder, gasPrice: 1}
    )
    afterBalance = await GetBalanceInfo()
    expect(afterBalance.real.toString()).to.be.equal(
      beforeBalance.real.minus(expectedUserAllowance).toString()
    )
    expect(afterBalance.stored.toString()).to.be.equal(
      beforeBalance.stored.minus(expectedUserAllowance).toString()
    )

    beforeBalance = await GetBalanceInfo()

    await token.transfer(tokenHolder, escrow.address, amountToDeposit)
    await token.transfer(tokenHolder, escrow.address, amountToDeposit)
    await token.transfer(tokenHolder, escrow.address, amountToDeposit)

    afterBalance = await GetBalanceInfo()

    expect(afterBalance.real.toString()).to.be.equal(
      beforeBalance.real.plus(fullAmountToDeposit.times(3)).toString()
    )
    expect(afterBalance.stored.toString()).to.be.equal(beforeBalance.stored.toString())
    await escrow.syncTokenBalance(token.address)
    afterBalance = await GetBalanceInfo()

    expect(afterBalance.real.toString()).to.be.equal(
      beforeBalance.real.plus(fullAmountToDeposit.times(3)).toString()
    )
    expect(afterBalance.stored.toString()).to.be.equal(
      beforeBalance.stored.plus(fullAmountToDeposit.times(3)).toString()
    )
  })

  it("should fail syncing token balance if it is not needed.", async () => {
    let escrowOwner = accounts[4]
    let tokenHolder = accounts[2]
    let authorizedAddress = accounts[3]
    shareFee = 10 // %
    await relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
    let escrow = await DeployEscrowAndInit(
      accounts[0],
      escrowOwner, // new owner of escrow
      authorizedAddress
    )
    let token = await DeployTestTokenAndApproveAllowance(
      accounts[0], // owner of a token and all initial funds
      tokenHolder, // allowance increased for this address
      escrow.address,
      10000
    )
    await escrow.syncTokenBalance(
      token.address
    ).catch(async (err) => {
      assert.isOk(err, "Expected error.")
    }).then(async (txn) => {
      if (txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should indicate correctly when sync is needed.", async () => {
    let escrowOwner = accounts[4]
    let tokenHolder = accounts[2]
    let authorizedAddress = accounts[3]
    shareFee = 10 // %
    await relay.setShareFee(shareFee, {from: accounts[0], gasPrice: 1})
    let escrow = await DeployEscrowAndInit(
      accounts[0],
      escrowOwner, // new owner of escrow
      authorizedAddress
    )
    let token = await DeployTestTokenAndApproveAllowance(
      accounts[0], // owner of a token and all initial funds
      tokenHolder, // allowance increased for this address
      escrow.address,
      10000
    )

    let isSyncNeeded = await escrow.isSyncNeededForToken(token.address)
    expect(isSyncNeeded).to.be.false

    await token.transfer(tokenHolder, escrow.address, "100")

    isSyncNeeded = await escrow.isSyncNeededForToken(token.address)
    expect(isSyncNeeded).to.be.true

    await escrow.syncTokenBalance(token.address)

    isSyncNeeded = await escrow.isSyncNeededForToken(token.address)
    expect(isSyncNeeded).to.be.false

    await token.transfer(tokenHolder, escrow.address, "1000")

    isSyncNeeded = await escrow.isSyncNeededForToken(token.address)
    expect(isSyncNeeded).to.be.true
  })
})
