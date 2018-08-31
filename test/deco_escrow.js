var BigNumber = require("bignumber.js")
var DecoTestToken = artifacts.require("./DecoTestToken.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoEscrowMock = artifacts.require("./DecoEscrowMock.sol")

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
      this.tokensValueAsBigNumber(amount).toString(),
      {from: sender, gasPrice: 1}
    )
  }

  async transferFrom(sender, from, to, amount) {
    return this.contract.transferFrom(
      from,
      to,
      this.tokensValueAsBigNumber(amount).toString(),
      {from: sender, gasPrice: 1}
    )
  }

  async transfer(sender, to, amount) {
    return this.contract.transfer(
      to,
      this.tokensValueAsBigNumber(amount).toString(),
      {from: sender, gasPrice: 1}
    )
  }

  async balanceOf(address) {
    return this.contract.balanceOf.call(address)
  }

  tokensValueAsBigNumber(amount) {
    let amountBigNumber = new BigNumber(amount)
    let decimalsAppendixBigNumber = (new BigNumber(10)).exponentiatedBy(this.decimals)
    return amountBigNumber.times(decimalsAppendixBigNumber)
  }
}


contract("DecoEscrow", async (accounts) => {

  const DeployTestToken = async () => {
    return DecoTestToken.new({from: accounts[0], gasPrice: 1})
  }

  it(
    "should accept direct payments in ETH to the contract address and correctly account incoming amount.",
    async () => {
      let decoEscrow = await DecoEscrow.deployed()
      let sendEthAndValidateBalance = async (senderAddress, amountToSendInETH, directSending) => {
        let weiValueToSend = web3.toWei(amountToSendInETH)
        let initialBalance = await decoEscrow.escrowBalance.call()
        let txn
        if(directSending) {
          txn = await decoEscrow.sendTransaction({from: senderAddress, gasPrice: 1, value: weiValueToSend})
        } else {
          txn = await decoEscrow.deposit({from: senderAddress, gasPrice: 1, value: weiValueToSend})
        }
        let resultingBalance = await decoEscrow.escrowBalance.call()
        expect(resultingBalance.toNumber()).to.be.equal(
          initialBalance.plus(weiValueToSend).toNumber()
        )

        let emittedEvent = txn.logs[0]
        let sentValueNumber = (new BigNumber(weiValueToSend)).toNumber()
        expect(emittedEvent.event).to.be.equal("IncomingPayment")
        expect(emittedEvent.args.from).to.be.equal(senderAddress)
        expect(emittedEvent.args.depositAmount.toNumber()).to.be.equal(sentValueNumber)
        expect(emittedEvent.args.paymentType.toNumber()).to.be.equal(0)
        expect((new BigNumber(emittedEvent.args.tokenAddress)).toNumber()).to.be.equal(0)
      }

      await sendEthAndValidateBalance(accounts[0], 0.5, false)
      await sendEthAndValidateBalance(accounts[1], 0.6, false)
      await sendEthAndValidateBalance(accounts[2], 0.3, true)
      await sendEthAndValidateBalance(accounts[3], 0.4, true)
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
      let weiAmount = web3.toWei(ethAmount)
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

    checkExceptionThrown(accounts[0], 0.1, sendEthDirectly)
    checkExceptionThrown(accounts[1], 0.15, sendEthDirectly)
    checkExceptionThrown(accounts[2], 0.2, sendEthDirectly)
    checkExceptionThrown(accounts[0], 0.1, sendEthIndirectly)
    checkExceptionThrown(accounts[1], 0.15, sendEthIndirectly)
    checkExceptionThrown(accounts[2], 0.2, sendEthIndirectly)
  })

  it(
    "should initialize contract successfully with a new owner address and authorized addresses from the original owner address.",
    async () => {
      let decoEscrow = await DecoEscrow.new({from: accounts[0], gasPrice: 1})
      let initialOwnerAddress = await decoEscrow.owner.call()
      let isFirstAddressAuthorizedInitially = await decoEscrow.fundsDistributionAuthorization.call(accounts[2])
      let isSecondAddressAuthorizedInitially = await decoEscrow.fundsDistributionAuthorization.call(accounts[3])
      await decoEscrow.initialize(accounts[1], [accounts[2], accounts[3]], {from: accounts[0], gasPrice: 1})
      let newOwner = await decoEscrow.owner.call()
      expect(newOwner).to.not.be.equal(initialOwnerAddress)
      expect(newOwner).to.be.equal(accounts[1])
      let isFirstAccountAuthorized = await decoEscrow.fundsDistributionAuthorization.call(accounts[2])
      expect(isFirstAddressAuthorizedInitially).to.not.be.equal(isFirstAccountAuthorized)
      let isSecondAccountAuthoried = await decoEscrow.fundsDistributionAuthorization.call(accounts[3])
      expect(isSecondAddressAuthorizedInitially).to.not.be.equal(isSecondAccountAuthoried)
    }
  )

  it("should fail the second initialization attempt.", async () => {
    let decoEscrow = await DecoEscrow.new({from: accounts[0], gasPrice: 1})
    await decoEscrow.initialize(accounts[1], [accounts[2], accounts[3]], {from: accounts[0], gasPrice: 1})
    await decoEscrow.initialize(accounts[4], [accounts[5], accounts[6]], {from: accounts[1], gasPrice: 1})
      .catch(async (err) => {
        assert.isOk(err, "Expected to fail here.")
        let owner = await decoEscrow.owner.call()
        expect(owner).to.be.equal(accounts[1])
        let isFirstNewAddressAuthorized = await decoEscrow.fundsDistributionAuthorization.call(accounts[5])
        expect(isFirstNewAddressAuthorized).to.be.false
        let isSecondNewAddressAuthorized = await decoEscrow.fundsDistributionAuthorization.call(accounts[6])
        expect(isSecondNewAddressAuthorized).to.be.false
    }).then(async (txn) => {
      if(txn) {
        assert.fail("Should have failed above.")
      }
    })
  })

  it("should fail the initialization if executed by not the initial owner.", async () => {
    let decoEscrow = await DecoEscrow.new({from: accounts[0], gasPrice: 1})
    await decoEscrow.initialize(accounts[1], [accounts[2], accounts[3]], {from: accounts[1], gasPrice: 1}).catch(async (err) => {
        assert.isOk(err, "Expected to fail here.")
        let owner = await decoEscrow.owner.call()
        expect(owner).to.be.equal(accounts[0])
        let isFirstNewAddressAuthorized = await decoEscrow.fundsDistributionAuthorization.call(accounts[5])
        expect(isFirstNewAddressAuthorized).to.be.false
        let isSecondNewAddressAuthorized = await decoEscrow.fundsDistributionAuthorization.call(accounts[6])
        expect(isSecondNewAddressAuthorized).to.be.false
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
      let decoEscrow = await DecoEscrow.deployed()
      let depositErc20TokenAndCheckState = async (sender, amountToSend) => {
        let initialRealContractTokensBalance = await decoTestToken.balanceOf(decoEscrow.address)
        let initialAccountedTokensBalance = await decoEscrow.escrowTokensBalance.call(decoTestToken.address)
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
          initialRealContractTokensBalance.plus(amountToWithdraw).toString()
        )

        let accountedTokensBalance = await decoEscrow.escrowTokensBalance.call(decoTestToken.address)
        expect(accountedTokensBalance.toString()).to.be.equal(
          initialAccountedTokensBalance.plus(amountToWithdraw).toString()
        )

        let emittedEvent = txn.logs[0]
        expect(emittedEvent.event).to.be.equal("IncomingPayment")
        expect(emittedEvent.args.from).to.be.equal(sender)
        expect(emittedEvent.args.depositAmount.toString()).to.be.equal(amountToWithdraw.toString())
        expect(emittedEvent.args.paymentType.toNumber()).to.be.equal(1)
        expect(emittedEvent.args.tokenAddress).to.be.equal(decoTestToken.address)
      }

      await depositErc20TokenAndCheckState(accounts[0], new BigNumber(13))
      await decoTestToken.transfer(accounts[0], accounts[1], 35)
      await depositErc20TokenAndCheckState(accounts[1], new BigNumber(17))
      await decoTestToken.transfer(accounts[0], accounts[2], 39)
      await depositErc20TokenAndCheckState(accounts[2], new BigNumber(19))
      await decoTestToken.transfer(accounts[0], accounts[3], 47)
      await depositErc20TokenAndCheckState(accounts[3], new BigNumber(23))
      await decoTestToken.transfer(accounts[0], accounts[4], 200003)
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
        let initialAccountedTokensBalance = await decoEscrow.escrowTokensBalance.call(decoTestToken.address)
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

          let accountedTokensBalance = await decoEscrow.escrowTokensBalance.call(decoTestToken.address)
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
        new BigNumber("1000000000000000000"),
        {from: accounts[0], gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err, "Expected exception.")
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    depositAndCheckException(accounts[1])
    depositAndCheckException(decoEscrow.address)
    depositAndCheckException("0x0")
  })

  it("should allow withdraw available ETH funds for the escrow owner.", async () => {
    let decoEscrow = await DecoEscrow.deployed()
    await decoEscrow.sendTransaction({from: accounts[6], gasPrice: 1, value: web3.toWei(3)})

    let withdrawAndCheckBalance = async (amountToWithdraw) => {
      let initialEscrowBalance = await decoEscrow.escrowBalance.call()
      await decoEscrow.withdraw(amountToWithdraw.toString(), {from: accounts[0], gasPrice: 1})
      let resultingEscrowBalance = await decoEscrow.escrowBalance.call()

      expect(amountToWithdraw.toString()).to.be.equal(
        initialEscrowBalance.minus(resultingEscrowBalance).toString()
      )
    }

    await withdrawAndCheckBalance(new BigNumber(web3.toWei(0.5)))
    await withdrawAndCheckBalance(new BigNumber(web3.toWei(1)))
  })

  it("should allow withdraw available ETH funds for the account with sufficient allowance.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.sendTransaction({from: accounts[6], gasPrice: 1, value: web3.toWei(3)})

    let withdrawAndCheckBalance = async (to, amountToWithdraw) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.times(1.1).toString(),
        {from: to, gasPrice: 1}
      )
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.escrowBalance.call()
      let txn = await decoEscrowMock.withdraw(amountToWithdraw.toString(), {from: to, gasPrice: 1})
      let resultingEscrowBalance = await decoEscrowMock.escrowBalance.call()
      let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      let resultingAddressBalance = await web3.eth.getBalance(to)

      expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
      expect(resultingAllowance.toString()).to.be.equal(
        initialAllowance.minus(amountToWithdraw).toString()
      )
      expect(resultingAddressBalance.toString()).to.be.equal(
        initialAddressBalance
          .plus(amountToWithdraw)
          .minus(new BigNumber(txn.receipt.gasUsed))
          .toString()
      )
    }

    await withdrawAndCheckBalance(accounts[1], new BigNumber(web3.toWei(0.5)))
    await withdrawAndCheckBalance(accounts[2], new BigNumber(web3.toWei(0.1)))
    await withdrawAndCheckBalance(accounts[3], new BigNumber(web3.toWei(0.3)))
    await withdrawAndCheckBalance(accounts[4], new BigNumber(web3.toWei(0.8)))
    await withdrawAndCheckBalance(accounts[5], new BigNumber(web3.toWei(0.0001)))
  })

  it("should fail withdrawal if accounted limit aka allowance or available escrow balance is exceeded.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    let depositAmount = new BigNumber(web3.toWei(1))
    await decoEscrowMock.sendTransaction({from: accounts[9], gasPrice: 1, value: depositAmount.toString()})
    let escrowAccountedBalance = await decoEscrowMock.escrowBalance.call()

    let tryWithdrawAndCheckException = async (to, amountToWithdraw) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.times(0.5).toString(),
        {from: to, gasPrice: 1}
      )
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.escrowBalance.call()
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      await decoEscrowMock.withdraw(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err,"Expected exception here.")
        let resultingEscrowBalance = await decoEscrowMock.escrowBalance.call()
        let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
        let resultingAddressBalance = await web3.eth.getBalance(to)

        expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
        expect(resultingAllowance.toString()).to.be.equal(initialAllowance.toString())
        expect(resultingAddressBalance.toString()).to.be.equal(
          initialAddressBalance.minus(new BigNumber(err.receipt.gasUsed)).toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await tryWithdrawAndCheckException(accounts[0], escrowAccountedBalance.plus(1000))
    await tryWithdrawAndCheckException(accounts[0], escrowAccountedBalance.plus(web3.toWei(1)))
    await tryWithdrawAndCheckException(accounts[1], new BigNumber(web3.toWei(0.04)))
    await tryWithdrawAndCheckException(accounts[2], new BigNumber(web3.toWei(0.02)))
    await tryWithdrawAndCheckException(accounts[3], new BigNumber(web3.toWei(0.05)))
    await tryWithdrawAndCheckException(accounts[4], new BigNumber(web3.toWei(0.000001)))
  })

  it("should fail withdrawal if requested amount is greater than actual contract balance.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.setEscrowBalanceValueToAlmostMaximum()

    let tryWithdrawAndCheckException = async (to, amountToWithdraw) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      )
      let initialAddressBalance = await web3.eth.getBalance(to)
      let initialEscrowBalance = await decoEscrowMock.escrowBalance.call()
      let initialAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
      await decoEscrowMock.withdraw(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      ).catch(async (err) => {
        assert.isOk(err,"Expected exception here.")
        let resultingEscrowBalance = await decoEscrowMock.escrowBalance.call()
        let resultingAllowance = await decoEscrowMock.withdrawalAllowanceForAddress(to)
        let resultingAddressBalance = await web3.eth.getBalance(to)

        expect(resultingEscrowBalance.toString()).to.be.equal(initialEscrowBalance.toString())
        expect(resultingAllowance.toString()).to.be.equal(initialAllowance.toString())
        expect(resultingAddressBalance.toString()).to.be.equal(
          initialAddressBalance.minus(new BigNumber(err.receipt.gasUsed)).toString()
        )
      }).then(async (txn) => {
        if(txn) {
          assert.fail("Should have failed above.")
        }
      })
    }

    await tryWithdrawAndCheckException(accounts[0], new BigNumber(web3.toWei(1)))
    await tryWithdrawAndCheckException(accounts[1], new BigNumber(web3.toWei(0.4)))
    await tryWithdrawAndCheckException(accounts[2], new BigNumber(web3.toWei(0.2)))
    await tryWithdrawAndCheckException(accounts[3], new BigNumber(web3.toWei(0.5)))
    await tryWithdrawAndCheckException(accounts[4], new BigNumber(web3.toWei(0.000001)))
  })

  it("should emit the event about outgoing ETH funds.", async () => {
    let decoEscrowMock = await DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
    await decoEscrowMock.sendTransaction({from: accounts[10], gasPrice: 1, value: web3.toWei(3)})

    let withdrawAndCheckEmittedEvent = async (to, amountToWithdraw) => {
      await decoEscrowMock.setEthWithdrawalAllowance(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      )
      let txn = await decoEscrowMock.withdraw(
        amountToWithdraw.toString(),
        {from: to, gasPrice: 1}
      )
      let emittedEvent = txn.logs[0]
      expect(emittedEvent.event).to.be.equal("OutgoingPayment")
      expect(emittedEvent.args.to).to.be.equal(to)
      expect(emittedEvent.args.amount.toString()).to.be.equal(amountToWithdraw.toString())
      expect(emittedEvent.args.paymentType.toNumber()).to.be.equal(0)
      expect((new BigNumber(emittedEvent.args.tokenAddress)).toNumber()).to.be.equal(0)
    }

    await withdrawAndCheckEmittedEvent(accounts[0], new BigNumber(web3.toWei(1)))
    await withdrawAndCheckEmittedEvent(accounts[1], new BigNumber(web3.toWei(0.4)))
    await withdrawAndCheckEmittedEvent(accounts[2], new BigNumber(web3.toWei(0.2)))
    await withdrawAndCheckEmittedEvent(accounts[3], new BigNumber(web3.toWei(0.5)))
    await withdrawAndCheckEmittedEvent(accounts[4], new BigNumber(web3.toWei(0.000001)))
  })

  it(
    "should allow withdrawal of ERC20 tokens with sufficient allowance or available tokens balance.",
    async () => {
      let decoEscrowMock = DecoEscrowMock.new({from: accounts[0], gasPrice: 1})
      let decoTestToken = Erc20Token.create(accounts[0])

    }
  )
})
