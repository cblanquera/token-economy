//to run this:
// $ npx hardhat run scripts/4-deploy-treasury.js

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

  console.log('Deploying Treasury ...')
  const treasury = await deploy('Treasury', admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('Treasury deployed to:', treasury.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    treasury.address,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - Treasury: REQUESTER_ROLE, APPROVER_ROLE')
  console.log('')
  console.log('Optional Steps:')
  console.log('In Treasury contract, grant PAUSER_ROLE to pauser')
  console.log(` - ${network.scanner}/address/${treasury.address}#writeContract`)
  console.log(` - grantRole( ${getRole('PAUSER_ROLE')}, [0x...] )`)
  console.log('')
  console.log('In Treasury contract, grant REQUESTER_ROLE to admin (choose another wallet)')
  console.log(` - ${network.scanner}/address/${treasury.address}#writeContract`)
  console.log(` - grantRole( ${getRole('REQUESTER_ROLE')}, ${admin.address} )`)
  console.log('')
  console.log('In Treasury contract, grant APPROVER_ROLE to admin (choose another wallet)')
  console.log(` - ${network.scanner}/address/${treasury.address}#writeContract`)
  console.log(` - grantRole( ${getRole('APPROVER_ROLE')}, ${admin.address} )`)
  console.log('')
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});