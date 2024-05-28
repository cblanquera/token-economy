//to run this:
// $ npx hardhat run scripts/2-deploy-vesting.js

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
  const admin = new ethers.Wallet(network.accounts[0])
  const token = { address: network.contracts.token }

  console.log('Deploying TokenVesting ...')
  const vesting = await deploy('TokenVesting', token.address, admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('TokenVesting deployed to:', vesting.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    vesting.address,
    `"${token.address}"`,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - TokenVesting: VESTER_ROLE, PAUSER_ROLE')
  console.log('')
  console.log('Next Steps:')
  console.log('In Token contract, grant MINTER_ROLE to TokenVesting')
  console.log(` - ${network.scanner}/address/${token.address}#writeContract`)
  console.log(` - grantRole( ${getRole('MINTER_ROLE')}, ${vesting.address} )`)
  console.log('')
  console.log('Optional Steps:')
  console.log('In TokenVesting contract, grant PAUSER_ROLE to pauser')
  console.log(` - ${network.scanner}/address/${vesting.address}#writeContract`)
  console.log(` - grantRole( ${getRole('PAUSER_ROLE')}, [0x...] )`)
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});