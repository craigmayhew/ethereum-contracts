# may turn out to be a terrible idea, but lets try a deployment pipeline that gets us to rinkeby or mainnet

# TODO: perhaps we ditch solc binary and entirely switch to the npm version
sudo apt-get install -y solc geth
npm install -g node-gyp
npm install web3@1.0.0-beta.37
npm install solc@0.5.0

# output versions for any future debugging
geth version
node -v
npm -v

if [[ $TRAVIS_BRANCH == 'master' ]]
then
  # import mainnet account
  mkdir -p $HOME/.ethereum/keystore/
  echo $MAINNET_PRIVATE_ACCOUNT_JSON > $HOME/.ethereum/keystore/encrypted-mainnet-account

  NETWORK=""
else
  # import rinkeby test account
  mkdir -p $HOME/.ethereum/rinkeby/keystore/
  echo $RINKEBY_PRIVATE_ACCOUNT_JSON > $HOME/.ethereum/rinkeby/keystore/encrypted-rinkeby-account

  NETWORK="--rinkeby"
fi

# connect to ethereum network
geth $NETWORK --cache 4096 --nousb --syncmode light &

if [[ $TRAVIS_BRANCH == 'master' ]]
then
  echo ""
else
  geth $NETWORK --exec 'loadScript("../rinkeby-peers.js")' attach
fi

# sleep to allow ethereum to sync
sleep 60s
while [ "$(geth $NETWORK --exec 'if(admin.peers.length > 0 && eth.syncing == false){2}else{0}' attach)" -lt 2 ]
do
  geth $NETWORK --exec 'eth.syncing' attach
  geth $NETWORK --exec '"still syncing, waiting 20s, total peers: " + admin.peers.length' attach && sleep 20s
done
echo "synced!"

STARTINGBALANCE="$(geth $NETWORK --exec 'web3.fromWei(eth.getBalance(eth.accounts[0]))' attach)"

# attempt to use geth, check some fundamentals
geth $NETWORK --exec '"gas price: " + eth.gasPrice' attach
geth $NETWORK --exec '"last block: " + eth.blockNumber' attach

#unlock wallet
if [[ $TRAVIS_BRANCH == 'master' ]]
then
  UNLOCK=$(printf "personal.unlockAccount(eth.accounts[0],'%s')" $MAINNET_PRIVATE_PASS)
else
  UNLOCK=$(printf "personal.unlockAccount(eth.accounts[0],'%s')" $RINKEBY_PRIVATE_PASS)
fi
geth $NETWORK --exec $UNLOCK attach

# compile 33.sol
solc --optimize --combined-json abi,bin contracts/33.sol > /tmp/33.compiled.js

# deploy 33.sol
node contracts/33.deploy.js

#sleep for two blocks to allow contract to deploy and tests to run
echo "sleep for 2 blocks" && geth $NETWORK --exec 'admin.sleepBlocks(2)' attach

# TODO: Check the exact number of transactions on the account matches expectations

# TODO: Check the before/after balances on wallet
ENDINGBALANCE="$(geth $NETWORK --exec 'web3.fromWei(eth.getBalance(eth.accounts[0]))' attach)"

printf "Starting balance: %s\n" $STARTINGBALANCE
printf "Final balance:    %s\n" $ENDINGBALANCE

if [ "${STARTINGBALANCE}" = "${ENDINGBALANCE}" ]
# TODO: consider using nodejs to see if these values are approximately equal
then
  # fail build as we don't have the expected balance
  printf "Error: Starting balance %s should not be the same as final balance %s\n" $STARTINGBALANCE $ENDINGBALANCE
  exit 1
fi

# cleanup for 33.sol
rm /tmp/33.compiled.js

# cleanup sensitive files
if [[ $TRAVIS_BRANCH == 'master' ]]
then
  rm $HOME/.ethereum/keystore/encrypted-mainnet-account
else
  rm $HOME/.ethereum/rinkeby/keystore/encrypted-rinkeby-account
fi