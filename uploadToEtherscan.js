const fs = require('fs')
const path = require('path')
const axios = require('axios')
const qs = require('querystring')

const contracts = {
  "DecoArbitration": "0x0428aCd58Dc71f7B121191B36c13DB536e0Ab8b4",
  "DecoEscrow": "0x534aca4E0d27527B04D800c9ca3cF8B9B8d40f7f",
  "DecoEscrowFactory": "0x6F75Bfc0005d745fce6546434c76bdF7C76B3c6D",
  "DecoMilestones": "0x5dD402d0E865a10558BFE3491e94C074cc65810f",
  "DecoProjects": "0x435Cd12f57F9B9ACeBbBe2444f3f8653913173a3",
  "DecoProxy": "0x0000EEe4CBaDa79Cf378e011FBd8b377fEDd04A5",
  "DecoProxyFactory": "0xA5fccc3F1A4e56fDA5A86F0fe8B7558881B67523",
  "DecoRelay": "0x32A6EeDA63740b7A9789Cb949660C03CD36fC59A"
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
  console.log('posting '+contract)
  axios.post("https://api.etherscan.io/api", qs.stringify({ //Set to the  correct API url for Other Networks
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
    // console.log(result);
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
    console.log('message: ' + result.message);
  }).catch(function (result) {
    console.error(result)
  });
})