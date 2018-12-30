# may turn out to be a terrible idea, but lets try a deployment pipeline that gets us to rinkeby

# TODO: perhaps we ditch solc binary and entirely switch to the npm version
sudo apt-get install -y solc geth
npm install -g node-gyp
npm install web3@1.0.0-beta.37
npm install solc@0.5.0

# output versions for any future debugging
geth version
node -v
npm -v

# import rinkeby test account
mkdir -p $HOME/.ethereum/rinkeby/keystore/
echo $RINKEBY_PRIVATE_ACCOUNT_JSON > $HOME/.ethereum/rinkeby/keystore/encrypted-rinkeby-account

# connect to rinkeby
geth --rinkeby --cache 4096 --nousb --syncmode light &

# sleep to allow rinkeby to sync
sleep 60s
while [ "$(geth --rinkeby --exec 'if(eth.syncing == false){2}else{0}' attach)" -lt 2 ]
do
geth --rinkeby --exec 'eth.syncing' attach
echo "still syncing, waiting 20s" && sleep 20s
done
echo "synced!"

STARTINGBALANCE="$(geth --rinkeby --exec 'web3.fromWei(eth.getBalance(eth.accounts[0]))' attach)"

# attempt to use geth, check some fundamentals
geth --rinkeby --exec '"gas price: " + eth.gasPrice' attach
geth --rinkeby --exec '"last block: " + eth.blockNumber' attach

#unlock wallet
UNLOCK=$(printf "personal.unlockAccount(eth.accounts[0],'%s')" $RINKEBY_PRIVATE_PASS)
geth --rinkeby --exec $UNLOCK attach

# compile 33.sol
solc --optimize --combined-json abi,bin contracts/33.sol > /tmp/33.compiled.js

# deploy 33.sol
node contracts/33.deploy.js

#sleep for two blocks to allow contract to deploy and tests to run
echo "sleep for 2 blocks" && geth --rinkeby --exec 'admin.sleepBlocks(2)' attach

# TODO: Check the exact number of transactions on the account matches expectations

# TODO: Check the before/after balances on wallet
ENDINGBALANCE="$(geth --rinkeby --exec 'web3.fromWei(eth.getBalance(eth.accounts[0]))' attach)"

printf "Starting balance: %s\n" $STARTINGBALANCE
printf "Final balance:    %s\n" $ENDINGBALANCE

if [ "${STARTINGBALANCE}" = "${ENDINGBALANCE}" ]
# TODO: consider using php -r "echo (2.981587915886330942-2.981587915886330942);"
then
  # fail build as we don't have the expected balance
  printf "Error: Starting balance %s should not be the same as final balance %s\n" $STARTINGBALANCE $ENDINGBALANCE
  exit 1
fi

# cleanup for 33.sol
rm /tmp/33.compiled.js

# cleanup sensitive files
rm $HOME/.ethereum/rinkeby/keystore/encrypted-rinkeby-account