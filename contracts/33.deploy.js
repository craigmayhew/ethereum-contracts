var fs = require('fs');
let Web3 = require('web3');

// Using the IPC provider in node.js
var net = require('net');
var web3 = new Web3('/home/travis/.ethereum/rinkeby/geth.ipc', net);

// pull in an extension to web3, courtesy of https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
web3.eth.getTransactionReceiptMined = require("../modules/getTransactionReceiptMined.js");

let storageOutput = fs.readFileSync('/tmp/33.compiled.js', 'utf8');
//convert the output from a string to a javascript object
storageOutput = JSON.parse(storageOutput);

web3.eth.net.isListening()
.then(function(e) {
    console.log('web3 is connected on ipc');
    return web3.eth.getAccounts();
}).then(function(e) {
    console.log('account: ',e[0]);
    let ethAccount = e[0];
    let storageContractAbi = storageOutput.contracts['contracts/33.sol:ethForAnswersBounty'].abi
    let storageContract = new web3.eth.Contract(JSON.parse(storageContractAbi))
    let storageBinCode = "0x" + storageOutput.contracts['contracts/33.sol:ethForAnswersBounty'].bin
    storageContract.deploy({
        data: storageBinCode,
        arguments: [29]
    }).send({
        from: ethAccount,
        gas: 1000000
    }).then(function (contract33) {
        console.log("Sending prize fund ether to 33.sol (answer=29) on rinkeby to: ", contract33.options.address);
        web3.eth.sendTransaction({from:ethAccount, to:contract33.options.address, value: 555529000})
        .then(function (txnHash) {
            // now you have the unmined transaction hash, return receipt promise
            console.log('transaction hash: '+txnHash.transactionHash);
            return web3.eth.getTransactionReceiptMined(txnHash.transactionHash);
        })
        .then(function (receipt) {
            console.log("Send correct answer for 33.sol (answer=29)")
            contract33.methods.attempt(3,1,1).send({
                from: ethAccount,
                gas: 1000000
            })
            .then(function(receipt){
                console.log("Sent correct answer for 33.sol (answer=29)")
            })
            .then(function(){
                process.exit(0);
            });
        })
    })
});

