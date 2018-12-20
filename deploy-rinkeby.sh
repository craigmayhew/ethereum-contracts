# connect to rinkeby
geth --rinkeby --cache 4096 --nousb --syncmode light --rpc --rpcapi eth,web3,personal &
# sleep to allow rinkeby to connect
sleep 40s

# attempt to use geth
geth --rinkeby --exec 'eth.getGasPrice(function(e,r){console.log("gas price: ",r)})' attach
geth --rinkeby --exec 'console.log("last block: ",eth.blockNumber)' attach

# compile 33.sol
echo 'storageOutput = ' > /tmp/33.js
solc --optimize --combined-json abi,bin contracts/33.sol >> /tmp/33.js
# write js deployment script for 33.sol
cat >> /tmp/33.js <<EOL
storageContractAbi = storageOutput.contracts['33.sol:ethForAnswersBounty'].abi
storageContract = eth.contract(JSON.parse(storageContractAbi))
storageBinCode = "0x" + storageOutput.contracts['33.sol:ethForAnswersBounty'].bin
personal.unlockAccount(
EOL
echo printf "personal.unlockAccount(%s,%s)" $RINKEBY_PUBLIC_ETH_ADDRESS $RINKEBY_PRIVATE_PASS >> /tmp/33.js
cat >> /tmp/33.js <<EOL
)
deployTransactionObject = { from: eth.accounts[0], data: storageBinCode, gas: 1000000 }
storageInstance = storageContract.new(deployTransactionObject)
EOL
# run js deployment script for 33.sol
geth --rinkeby --exec 'loadScript("/tmp/33.js")' attach
# cleanup for 33.sol
rm /tmp/33.js