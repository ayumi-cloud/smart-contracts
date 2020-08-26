usePlugin('@nomiclabs/buidler-ethers');
const fs = require('fs');
const path = require('path');
const BN = require('ethers').BigNumber;

let configPath;

const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let boostTokenAddress;
let gasPrice = new BN.from(275).mul(new BN.from(10).pow(new BN.from(9)));
let setter;
let starttime;
let duration;
let tokens;
let boostToken;
let boostTokenAmount;
let internalPoolBoostAmount = new BN.from('60000').mul(new BN.from('10').pow(new BN.from('18')));
let rewardsPool;

task('deployTokenRewards', 'deploy boost token + reward pools').setAction(async () => {
  network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  let deployerAddress = await deployer.getAddress();
  let BoostToken;
  let RewardsPool;

  // use mainnet contracts
  BoostToken = await ethers.getContractFactory('BoostToken');
  RewardsPool = await ethers.getContractFactory('BoostRewardsPool');
  // 4000 per pool
  boostTokenAmount = new BN.from('4000').mul(new BN.from('10').pow(new BN.from('18')));
  configPath = path.join(__dirname, './mainnet_settings.json');

  readParams(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  console.log("Deploying token...");
  boostToken = await BoostToken.deploy({gasPrice: gasPrice});
  await boostToken.deployed();
  console.log(`boostToken: ${boostToken.address}`);

  for (let token of tokens) {
    console.log(`Deploying ${token.name} rewards pool...`);
    rewardsPool = await RewardsPool.deploy(
      new BN.from(token.cap),
      token.address,
      boostToken.address,
      setter,
      uniswapRouter,
      starttime,
      duration,
      {gasPrice: gasPrice}
    );
    await rewardsPool.deployed();
    console.log(`${token.name} pool address: ${rewardsPool.address}`);
    console.log('Transferring boost tokens to pool');
    await boostToken.transfer(rewardsPool.address, boostTokenAmount, {gasPrice: gasPrice});
    console.log('Notifying reward amt');
    await rewardsPool.notifyRewardAmount(boostTokenAmount, {gasPrice: gasPrice});
    console.log(`Renouncing ownership of ${token.name} pool`);
    await rewardsPool.renounceOwnership({gasPrice: gasPrice});
  }

  await boostToken.transfer(setter, internalPoolBoostAmount);
  await boostToken.removeMinter(deployerAddress);
  await boostToken.setGovernance(ethers.constants.AddressZero);
  process.exit(0);
});

function readParams(jsonInput) {
  boostTokenAddress = jsonInput.boostToken;
  setter = jsonInput.setter;
  tokens = jsonInput.tokens;
  starttime = jsonInput.starttime;
  duration = jsonInput.duration;
}
