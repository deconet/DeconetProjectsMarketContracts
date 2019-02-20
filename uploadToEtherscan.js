const fs = require('fs')
const path = require('path')
const axios = require('axios')
const qs = require('querystring')

const contracts = {
  "DecoArbitration": "0x624D87ac0f6467E55069a602e96Bb91B2b133CC1",
  "DecoEscrow": "0xDDF140275301A6c83C502fAd5F24E19DDbCD05B1",
  "DecoEscrowFactory": "0x04ff5aF790eFCFB75056298d88334EAE36EF47B2",
  "DecoMilestones": "0x36B629d3FE296919F600CaA2FB3F3049CB9DC899",
  "DecoProjects": "0x45842F607b3a139eE63B41d3336591d15ce7CB91",
  "DecoProxy": "0x84B3a20F028AA8A87D91ea90dfF80adBB8fe849f",
  "DecoProxyFactory": "0x100Ff56EE6f4a6dA58e9b088e236037afaa6Aa5C",
  "DecoRelay": "0x1eE040fA066823472675e957949d0192d230bd31"
}

const apiKey = process.env.ETHERSCAN_API_KEY

const sourceCode = fs.readFileSync(path.resolve(__dirname, 'flatContracts/DecoEverything.sol'), 'utf8')

const config = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

Object.keys(contracts).forEach(contract => {
  const address = contracts[contract]

  // get constructor arguments

  axios.post("https://api-kovan.etherscan.io/api", qs.stringify({ //Set to the  correct API url for Other Networks
    apikey: apiKey,                     //A valid API-Key is required
    module: 'contract',                             //Do not change
    action: 'verifysourcecode',                     //Do not change
    contractaddress: address,   //Contract Address starts with 0x...
    sourceCode: sourceCode,             //Contract Source Code (Flattened if necessary)
    contractname: contract,         //ContractName
    compilerversion: "v0.4.25+commit.59dbf8f1",   // see http://etherscan.io/solcversions for list of support versions
    optimizationUsed: 0, //0 = Optimization used, 1 = No Optimization
    runs: 200,                                      //set to 200 as default unless otherwise
  }),config).then(function (result) {
    console.log(result);
    // if (result.status == "1") {
    //     //1 = submission success, use the guid returned (result.result) to check the status of your submission.
    //     // Average time of processing is 30-60 seconds
    //     // document.getElementById("postresult").innerHTML = result.status + ";" + result.message + ";" + result.result;
    //     // result.result is the GUID receipt for the submission, you can use this guid for checking the verification status
    // } else {
    //     //0 = error
    //     // document.getElementById("postresult").innerHTML = result.status + ";" + result.message + ";" + result.result;
    // }
    console.log("status : " + result.status);
    console.log("result : " + result.result);
  }).catch(function (result) {
    console.error(result)
  });
})