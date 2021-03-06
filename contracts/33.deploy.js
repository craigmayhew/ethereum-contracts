var fs = require('fs');
let Web3 = require('web3');

// Using the IPC provider in node.js
var net = require('net');
if ('master' == process.env.TRAVIS_BRANCH){
    ipcLocation = '/home/travis/.ethereum/geth.ipc';
}else{
    ipcLocation = '/home/travis/.ethereum/rinkeby/geth.ipc';
}
var web3 = new Web3(ipcLocation, net);

// pull in an extension to web3, courtesy of https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
web3.eth.getTransactionReceiptMined = require("../modules/getTransactionReceiptMined.js");

let storageOutput = fs.readFileSync('/tmp/33.compiled.js', 'utf8');
//convert the output from a string to a javascript object
storageOutput = JSON.parse(storageOutput);

const answers = {
    ans24: [24,-2901096694, -15550555555, 15584139827],
    ans29: [29,3,1,1]
}

let testRunsCompleted = 0;

web3.eth.net.isListening()
.then(function(e) {
    console.log('web3 is connected on ipc to geth via', ipcLocation);
    return web3.eth.getAccounts();
}).then(function(e) {
    console.log('account:',e[0]);

    let ethAccount = e[0];
    let storageContractAbi = storageOutput.contracts['contracts/33.sol:ethForAnswersBounty'].abi;
    let storageContract = new web3.eth.Contract(JSON.parse(storageContractAbi));
    let storageBinCode = "0x" + storageOutput.contracts['contracts/33.sol:ethForAnswersBounty'].bin;

    web3.eth.net.getNetworkType()
    .then(function(network) {
        console.log("web3 detects network:", network);
        //mainnet only
        if("main" == network){
            console.log("Deploying 33.sol to mainnet");
            storageContract.deploy({
                data: storageBinCode,
                arguments: [33]
            }).send({
                from: ethAccount,
                gas: 1000000
            }).then(function (contract) {
                //successful deployment
                process.exit(0);
            }).catch(function (err) {
                console.log(" ✘ Deploy FAILURE for 33.sol", err);
                process.exit(1);
            });
        }else{
            //rinkeby only
            for (let ans in answers) {
                storageContract.deploy({
                    data: storageBinCode,
                    arguments: [answers[ans][0]]
                }).send({
                    from: ethAccount,
                    gas: 1000000
                }).then(function (contract33) {
                    console.log(" . Sending prize fund ether to 33.sol (answer="+answers[ans][0]+") on rinkeby to: ", contract33.options.address);
                    web3.eth.sendTransaction({from:ethAccount, to:contract33.options.address, value: answers[ans][0]*1000})
                    .then(function (txnHash) {
                        // now you have the unmined transaction hash, return receipt promise
                        console.log(" ✔ Sent prize fund ether to 33.sol (answer="+answers[ans][0]+") on rinkeby. transaction: "+txnHash.transactionHash);
                        return web3.eth.getTransactionReceiptMined(txnHash.transactionHash);
                    })
                    .then(function (receipt) {
                        console.log(" . Sending correct answer for 33.sol (answer="+answers[ans][0]+")")
                        contract33.methods.attempt(answers[ans][1],answers[ans][2],answers[ans][3]).send({
                            from: ethAccount,
                            gas: 1000000
                        })
                        .then(function(receipt){
                            console.log(" ✔ Sent correct answer for 33.sol (answer="+answers[ans][0]+")")
                        })
                        .then(function(){
                            //check we have the correct (one) number of transactions from the contract using 
                            web3.eth.getTransactionCount(contract33.options.address, function (err, res){
                                if(res == 1){
                                    console.log(" ✔ Confirmed, correctly sent outgoing txn from contract "+answers[ans][0]);
                                    //if we have completed our test run on all created contracts, then nodejs should exit cleanly
                                    testRunsCompleted++;
                                    if(testRunsCompleted == Object.keys(answers).length){
                                        process.exit(0);
                                    }
                                }else{
                                    console.log(" ✘ FAIL, cannot see correct outgoing txns from contract "+answers[ans][0]);
                                    process.exit(1);
                                }
                            });
                        })
                        .catch(function (err) {
                            console.log(" ✘ FAILURE 5", err);
                            process.exit(1);
                        });
                    })
                    .catch(function (err) {
                        console.log(" ✘ FAILURE 4", err);
                        process.exit(1);
                    });
                })
                .catch(function (err) {
                    console.log(" ✘ FAILURE 3", err);
                    process.exit(1);
                });
            }
        }
    })
    .catch(function (err) {
        console.log(" ✘ FAILURE 2", err);
        process.exit(1);
    });
})
.catch(function (err) {
    console.log(" ✘ FAILURE 1", err);
    process.exit(1);
});
