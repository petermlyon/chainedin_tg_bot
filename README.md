cd BotDocker
npm install

## ensure abi.json, bot.js/contractAddress & network are set according to the scaffold-eth project

## to run locally:

node bot.js

## to deploy to docker:
## requires docker desktop installed

brew install buildkit
docker buildx build --platform linux/arm64 --tag <docker-hub-user>/botdocker .
docker buildx build --platform linux/amd64 --tag <docker-hub-user>/botdocker .

docker build --tag botdocker .
docker login
docker tag botdocker <docker-hub-user>/botdocker:1.0.0
docker push <docker-hub-user>/botdocker:1.0.0

## to deploy to iExec
## requires iexec development kit to be set up

cd iexec
# update app checksum 
iexec app deploy
iexec app run --workerpool debug-v8-bellecour.main.pools.iexec.eth --watch
