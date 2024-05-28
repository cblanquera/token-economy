//to run this:
// $ npx hardhat run scripts/3-deploy-sale.js

const hardhat = require('hardhat')

async function deploy(name, ...params) {
  //deploy the contract
  const ContractFactory = await hardhat.ethers.getContractFactory(name);
  const contract = await ContractFactory.deploy(...params);
  await contract.deployed();

  return contract;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(
    hardhat.ethers.utils.solidityKeccak256(['string'], [name]).slice(2)
    , 'hex'
  ).toString('hex');
}

async function main() {
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const token = { address: network.contracts.token }
  const vesting = { address: network.contracts.vesting }

  console.log('Deploying TokenSale ...')
  const sale = await deploy('TokenSale', token.address, vesting.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('TokenSale deployed to:', sale.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    sale.address,
    `"${token.address}"`,
    `"${vesting.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - TokenSale: Ownable (should pass on)')
  console.log('')
  console.log('Next Steps:')
  console.log('In TokenVesting contract, grant VESTER_ROLE to TokenSale')
  console.log(` - ${network.scanner}/address/${vesting.address}#writeContract`)
  console.log(` - grantRole( ${getRole('VESTER_ROLE')}, ${sale.address} )`)
  console.log('')
  console.log('In TokenSale contract, set token limit, price and vested date')
  console.log(` - ${network.scanner}/address/${sale.address}#writeContract`)
  console.log(` - setTokenLimit( 5000000000000000000000 )`)
  console.log(` - setTokenPrice( 1000000000000000 )`)
  console.log(` - setVestedDate( 1696089600 )`)
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});