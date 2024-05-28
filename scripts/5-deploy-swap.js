//to run this:
// $ npx hardhat run scripts/5-deploy-swap.js

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
  const treasury = { address: network.contracts.treasury }

  console.log('Deploying TokenSwap ...')
  const swap = await deploy('TokenSwap', token.address, treasury.address, admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('TokenSwap deployed to:', swap.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    swap.address,
    `"${token.address}"`,
    `"${treasury.address}"`,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - TokenSwap: CURATOR_ROLE, PAUSER_ROLE')
  console.log('')
  console.log('Next Steps:')
  console.log('In TokenSwap contract, grant CURATOR_ROLE to admin (choose another wallet)')
  console.log(` - ${network.scanner}/address/${swap.address}#writeContract`)
  console.log(` - grantRole( ${getRole('CURATOR_ROLE')}, ${admin.address} )`)
  console.log('')
  console.log(`Send 10 ETH to TokenSwap ${swap.address}`)
  console.log('In Token contract, mint 5,000 tokens to swap')
  console.log(` - ${network.scanner}/address/${token.address}#writeContract`)
  console.log(` - mint( ${swap.address}, 5000000000000000000000 )`)
  console.log('')
  console.log('Optional Steps:')
  console.log('In TokenSwap contract, grant PAUSER_ROLE to pauser')
  console.log(` - ${network.scanner}/address/${swap.address}#writeContract`)
  console.log(` - grantRole( ${getRole('PAUSER_ROLE')}, [0x...] )`)
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});