usePlugin('@nomiclabs/buidler-ethers');
const fs = require('fs');
const path = require('path');
const BN = require('ethers').BigNumber;

let configPath;

let setter;
let stablecoin;
let boostTokenAddress;
let boostToken;
let boostTokenAmount = new BN.from('60000').mul(new BN.from('10').pow(new BN.from('18')));
let internalPool;
let gov;

task('internalPoolGov', 'deploy internal pool + gov contract').setAction(async () => {
  network = await ethers.provider.getNetwork();
  let InternalPool;
  let BoostGov;
  let uniswapFactory = await ethers.getContractAt('IUniswapV2Factory', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');
  let uniswapRouter = await ethers.getContractAt('UniswapRouter', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
  if (network == 1) {
    // user mainnet contracts
    InternalPool = await ethers.getContractFactory('BoostRewardsInternalPool');
    BoostGov = await ethers.getContractFactory('BoostGov');
    configPath = path.join(__dirname, './mainnet_settings.json');
    readParams(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    boostToken = await ethers.getContractAt('BoostToken', boostTokenAddress);
  } else {
    // use kovan contracts
    InternalPool = await ethers.getContractFactory('BoostRewardsInternalPoolKovan');
    BoostGov = await ethers.getContractFactory('BoostGovKovan');
    configPath = path.join(__dirname, './kovan_settings.json');
    readParams(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    boostToken = await ethers.getContractAt('BoostToken', boostTokenAddress);
  }

  // create uniswap pool, get address
  let weth = await uniswapRouter.WETH();
  await uniswapFactory.createPair(weth, boostTokenAddress);
  let uniswapToken = await uniswapFactory.getPair(weth, boostTokenAddress);
  console.log(`uniswap LP Token: ${uniswapToken}`);
  // internal boost pool: cap to 100 tokens for now
  internalPool = await InternalPool.deploy(
    new BN.from('100000').mul(new BN.from('10').pow(new BN.from('18'))),
    uniswapToken,
    boostTokenAddress,
    setter
  );
  await internalPool.deployed();
  console.log(`${uniswapToken} pool address: ${internalPool.address}`);
  await internalPool.notifyRewardAmount(boostTokenAmount);
  await internalPool.renounceOwnership();

  // deploy gov
  gov = await BoostGov.deploy(boostTokenAddress, stablecoin);
  await gov.deployed();
  console.log(`governance address: ${gov.address}`);
  console.log('TODOs:');
  console.log('1) Transfer reward from multisig to internal pool');
  console.log('2) Call `setGovernance` for each pool');
  process.exit(0);
});

function readParams(jsonInput) {
  setter = jsonInput.setter;
  stablecoin = jsonInput.stablecoin;
  boostTokenAddress = jsonInput.boostToken;
}
