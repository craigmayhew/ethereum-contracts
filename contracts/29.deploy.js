var fs = require('fs');
let Web3 = require('web3');

let web3 = new Web3('ws://localhost:8545');
 
let storageOutput = fs.readFileSync('/tmp/29.compiled.js', 'utf8');
//convert the output from a string to a javascript object
storageOutput = JSON.parse(storageOutput);

web3.eth.net.isListening()
.then(() => console.log('web3 is connected, accounts: ', web3.eth.accounts))
.catch(e => console.log('ERROR connection not made to local node ws://localhost:8545'));

let storageContractAbi = storageOutput.contracts['contracts/29.sol:ethForAnswersBounty'].abi
let storageContract = new web3.eth.Contract(JSON.parse(storageContractAbi))
let storageBinCode = "0x" + storageOutput.contracts['contracts/29.sol:ethForAnswersBounty'].bin
storageContract.deploy({
    data: storageBinCode,
    arguments: [29]
}).send({
    from: web3.eth.accounts[0],
    gas: 1000000
}).then(function (contract29) {
    //console.log(contract29.address) // the contract address
    console.log("Sending prize fund ether to 29.sol on rinkeby to: ", contract29.address)
    eth.sendTransaction({from:web3.eth.accounts[0], to:contract29.address, value: 555529000})
    .then(function (txnHash) {
        // now you have the unmined transaction hash, return receipt promise
        console.log(txnhash); // follow along
        return web3.eth.getTransactionReceiptMined(txnHash);
    })
    .then(function (receipt) {
        console.log("Send correct answer for 29.sol")
        let getData = contract29.attempt.getData(2220422932,-2128888517,-283059956)
        return web3.eth.sendTransaction({from:web3.eth.accounts[0], to:contract29.address, data: getData})
    })
})
