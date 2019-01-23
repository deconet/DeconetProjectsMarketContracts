var BigNumber = require("bignumber.js")
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })
var abi = require('ethereumjs-abi')
var ethUtil = require('ethereumjs-util');
var DecoTestToken = artifacts.require("./DecoTestToken.sol")
var DecoMilestones = artifacts.require("./DecoMilestones.sol")
var DecoProjects = artifacts.require("./DecoProjects.sol")
var DecoRelay = artifacts.require("./DecoRelay.sol")
var DecoEscrow = artifacts.require("./DecoEscrow.sol")
var DecoArbitration = artifacts.require("./DecoArbitration.sol")
var DecoProxyFactory = artifacts.require("./DecoProxyFactory.sol")
var DecoProxy = artifacts.require("./DecoProxy.sol")

contract("DecoProxy", async (accounts) => {
  // these match the seed "meow" for ganache-cli which is equivilant to the below mnemonic
  // Mnemonic:      neck unique maid derive cry road sphere pencil rubber where segment drip
  // Base HD Path:  m/44'/60'/0'/0/{account_index}
  // This is necessary because we need to manually sign the proposal EIP712 hash.  using built in web3.eth.sign prepends "ETHERUEM SIGNED MESSAGE" which is not part of EIP712 and sig verification fails.
  const privateKeys = [
    '0x03b4cd8d97b067544a40a97f837b0c8fadf35ec07607447fd65f16190a5afe21',
    '0x89f0b0c08a29c3636413c94f172574f3d225964b3f2f796ed4f37a9969893424',
    '0xed5aaf569a3fba0d9de50bd252c1a622f7784185c29b3d7cba2092ba8905d6b2',
    '0x47fee41f88b3564a1a79ae62de75e0e081b23d6c18407296c038e45553164c56',
    '0xe591dcedc381f133cdafd160e527131f0a4a3d11f0f4c9c24171e3f3be0e6380',
    '0x16562657d708a5f8cc9b5c5d68961c2143e91e9b54ca7e8ced4aea662b5a0854',
    '0x5567f54297657c3c64a8e5e78ce97f4d9d4d3dd7fba940ea06805b80f486ce58',
    '0xcb0f013922f60ee1f2d3d76f5318619ae783338f5e9367b8292eff99f7d942ff',
    '0x7596141c16a45fce4ca1816d3b36a3c94c625ae722ed1e02333acd392032078d',
    '0x075e8e62de05c2c09445c6c4d84f15f09d65fbc89f5af62d25c7e5b06fbc51d6',
    '0xb28b9b1918797e58a6c7c77ae8a9193101deed0df85307eb7e9265f87b36c2c0',
    '0x5ed62047cf9cf87f6458541ef2042ae88e9cec52cef440f7e30cdea6bec0e90f',
    '0xc68fd99a6686f93dba620ae356b3a1b84ec9e9f1ca228e25ec72b7895292414d',
    '0x1b2f251773eeeb9e62d81cf9b09f2899be98f7b3647ee0d25d9de4ecc8670ecf',
    '0x8e9a401f07e2ebe3ac6962d60643de51d27840359edd9cd520566c2a2b8829ac',
    '0xee7a2f7218e8ff41a15f58efc6f2d7b7c58f1a76e284693ac9cc5e5fd082128c',
    '0x26891a4787c68cc5f269b8f0fe6e835fa7eb9043dbb02ea5575c176e418ba9ac',
    '0xd14d183ecfef6fc776c62fc07aa8adc1eb3b91091898b617abbeaf444d20f1c1',
    '0x967b0993f37035bc69bf3d4c223e22bff6f53a25808cea011da110f392cc8e2a',
    '0xf7248620349995c738f912694f2c385f433436ca09972c7e3e26b27a43a0a265'
  ]

  const typedData = {
    types: {
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
        ],
        Proposal: [
            { name: 'agreementId', type: 'string' },
            { name: 'arbiter', type: 'address' }
        ]
    },
    primaryType: 'Proposal',
    domain: {
        name: 'Deco.Network',
        version: '1',
        chainId: 95,
        verifyingContract: ''
    }
  };

  const types = typedData.types;

  // Recursively finds all the dependencies of a type
  const dependencies = (primaryType, found = []) => {
      if (found.includes(primaryType)) {
          return found;
      }
      if (types[primaryType] === undefined) {
          return found;
      }
      found.push(primaryType);
      for (let field of types[primaryType]) {
          for (let dep of dependencies(field.type, found)) {
              if (!found.includes(dep)) {
                  found.push(dep);
              }
          }
      }
      return found;
  }

  const encodeType = (primaryType) => {
      // Get dependencies primary first, then alphabetical
      let deps = dependencies(primaryType);
      deps = deps.filter(t => t != primaryType);
      deps = [primaryType].concat(deps.sort());

      // Format as a string with fields
      let result = '';
      for (let type of deps) {
          result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
      }
      return result;
  }

  const typeHash = (primaryType) => {
      // console.log('typehash for '+primaryType+' is 0x'+ethUtil.keccak256(encodeType(primaryType)).toString('hex'))
      return ethUtil.keccak256(encodeType(primaryType));
  }

  const encodeData = (primaryType, data) => {
    let encTypes = [];
    let encValues = [];

    // Add typehash
    encTypes.push('bytes32');
    encValues.push(typeHash(primaryType));

    // Add field contents
    for (let field of types[primaryType]) {
      let value = data[field.name];
      if (field.type == 'string' || field.type == 'bytes') {
        encTypes.push('bytes32');
        value = ethUtil.keccak256(value);
        encValues.push(value);
      } else if (types[field.type] !== undefined) {
        encTypes.push('bytes32');
        value = ethUtil.keccak256(encodeData(field.type, value));
        encValues.push(value);
      } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
        throw 'TODO: Arrays currently unimplemented in encodeData';
      } else {
        encTypes.push(field.type);
        encValues.push(value);
      }
    }
    // console.log('encoding types: ', encTypes)
    // console.log('encoding values: ', encValues)
    return abi.rawEncode(encTypes, encValues);
  }

  const structHash = (primaryType, data) => {
    return ethUtil.keccak256(encodeData(primaryType, data))
  }

  const padWithZeroes = (number, length) => {
    var myString = '' + number
    while (myString.length < length) {
      myString = '0' + myString
    }
    return myString
  }

  const concatSig = (v, r, s) => {
    const rSig = ethUtil.fromSigned(r)
    const sSig = ethUtil.fromSigned(s)
    const vSig = ethUtil.bufferToInt(v)
    const rStr = padWithZeroes(ethUtil.toUnsigned(rSig).toString('hex'), 64)
    const sStr = padWithZeroes(ethUtil.toUnsigned(sSig).toString('hex'), 64)
    const vStr = ethUtil.stripHexPrefix(ethUtil.intToHex(vSig))
    return ethUtil.addHexPrefix(rStr.concat(sStr, vStr)).toString('hex')
  }

  const GetSignature = async (agreementId, makerAddressIndex, arbiter) => {
    typedData.domain.verifyingContract = decoProjects.address
    // console.log('EIP712Domain: 0x'+structHash('EIP712Domain', typedData.domain).toString('hex'))
    // console.log('hashed proposal: 0x'+structHash(typedData.primaryType, { agreementId: mock.agreementId, arbiter: mock.arbiter }).toString('hex'))
    const toSign = Buffer.concat([
        Buffer.from('1901', 'hex'),
        structHash('EIP712Domain', typedData.domain),
        structHash(typedData.primaryType, { agreementId: agreementId, arbiter: arbiter }),
    ])
    // console.log('hashing this: '+'0x' + toSign.toString('hex'))
    signatureHash = ethUtil.keccak256(toSign)
    // console.log('signatureHash: '+signatureHash)
    let sigParts = ethUtil.ecsign(signatureHash, ethUtil.toBuffer(privateKeys[makerAddressIndex]))
    return ethUtil.bufferToHex(concatSig(sigParts.v, sigParts.r, sigParts.s))
  }

  let decoProjects, decoMilestones, decoEscrow, decoRelay, decoTestToken, decoProxy, decoProxyFactory, decoArbitration

  let maker, arbiter, makerAddressIndex

  let owner, admin

  before(async () => {
    owner = accounts[5]
    admin = accounts[1]

    makerAddressIndex = 2
    maker = accounts[makerAddressIndex]

    decoProjects = await DecoProjects.deployed()
    decoMilestones = await DecoMilestones.deployed()
    decoRelay = await DecoRelay.deployed()
    decoTestToken = await DecoTestToken.new({from: accounts[0], gasPrice: "1"})
    decoProxyFactory = await DecoProxyFactory.deployed()
    decoArbitration = await DecoArbitration.deployed()

    arbiter = decoArbitration.address

    let txn = await decoProxyFactory.createProxy(owner, admin, {from: accounts[0], gasPrice: "1"})
    let event = txn.logs[0]
    decoProxy = await DecoProxy.at(event.args.newProxyAddress)

  })

  it("should start project from proxy.", async () => {
    let agreementId = "Test agreement id"
    let agreementHash = web3.utils.soliditySha3(agreementId)
    let signature = await GetSignature(agreementId, makerAddressIndex, arbiter)
    console.log("Signature is " + signature)
    let client = decoProxy.address // proxy is going to own the project.
    let milestonesCount = "1"
    let startWindow = "1"
    let feedbackWindow = "1"

    let projectWeb3Contract = new web3.eth.Contract(
      DecoProjects.abi,
      decoProjects.address,
      {from: admin, gasPrice: "20", gas: "1000000"}
    )

    let data = projectWeb3Contract.methods.startProject(
      agreementId,
      client,
      arbiter,
      maker,
      signature,
      milestonesCount,
      startWindow,
      feedbackWindow,
      false
    ).encodeABI()

    let proxyOperationHash = await decoProxy.getHash(
      owner,
      decoProjects.address,
      "0",
      data
    )

    let proxyTxnSignature = await web3.eth.sign(proxyOperationHash, owner)

    await decoProxy.forward(
      proxyTxnSignature,
      owner,
      decoProjects.address,
      "0",
      data,
      {from: admin, gasPrice: "20", gas: "2000000"}
    )

    let projectArray = await decoProjects.projects.call(agreementHash)
    expect(projectArray[0]).to.not.be.undefined
    console.log("Project started!!!")
    console.log(projectArray)



  })
})
