const { expect, deploy, bindContract, getRole } = require('./utils')

describe('TokenSale Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    const token = await deploy('Token', signers[0].address);
    await bindContract('withToken', 'Token', token, signers);
    const vesting = await deploy('TokenVesting', token.address, signers[0].address);
    await bindContract('withVesting', 'TokenVesting', vesting, signers);
    const sale = await deploy('TokenSale', token.address, vesting.address);
    await bindContract('withSale', 'TokenSale', sale, signers);
    const usdc = await deploy('MockERC20USDC');
    await bindContract('withUSDC', 'MockERC20USDC', usdc, signers);

    const [ admin, investor1, investor2, investor3, investor4 ] = signers;

    await admin.withToken.grantRole(getRole('MINTER_ROLE'), sale.address);
    await admin.withToken.grantRole(getRole('MINTER_ROLE'), vesting.address);
    await admin.withVesting.grantRole(getRole('PAUSER_ROLE'), admin.address);
    await admin.withVesting.grantRole(getRole('VESTER_ROLE'), sale.address);

    await admin.withUSDC.mint(investor4.address, 10000000) //250 Tokens

    this.signers = {
      admin,
      investor1,
      investor2,
      investor3,
      investor4
    };
  });

  it('Should error buying when sale it not staged', async function () {
    const { admin, investor1 } = this.signers;

    await expect(
      admin.withSale['buy(address,uint256)'](
        investor1.address, 
        ethers.utils.parseEther('100000'), 
        { value: ethers.utils.parseEther('1') }
      )
    ).to.be.revertedWith('InvalidCall()');
  });

  it('Should set the vesting stage', async function () {
    const { admin } = this.signers;
    await admin.withSale.setTokenLimit(ethers.utils.parseEther('5000'));
    await admin.withSale['setTokenPrice(uint256)'](ethers.utils.parseEther('0.001'));
    await admin.withSale['setTokenPrice(address,uint256)'](
      admin.withUSDC.address, 
      40000
    );

    // May 1, 2024 12:00AM GMT
    await admin.withSale.setVestedDate(1714521600);

    expect(await admin.withSale.currentTokenLimit()).to.equal(ethers.utils.parseEther('5000'));
    expect(await admin.withSale.currentTokenPrice()).to.equal(ethers.utils.parseEther('0.001'));
    expect(await admin.withSale.currentVestedDate()).to.equal(1714521600);
  });

  it('Should buy tokens', async function () {
    const { admin, investor1, investor2, investor3, investor4 } = this.signers;

    await admin.withSale['buy(address,uint256)'](investor1.address, ethers.utils.parseEther('100'), {
      value: ethers.utils.parseEther('0.1')
    });

    expect(
      (await admin.withVesting.vesting(investor1.address)).total
    ).to.equal(ethers.utils.parseEther('100'));

    await admin.withSale['buy(address,uint256)'](investor2.address, ethers.utils.parseEther('1000'), {
      value: ethers.utils.parseEther('1')
    });

    expect((await admin.withVesting.vesting(investor2.address)).total).to.equal(ethers.utils.parseEther('1000'));

    await admin.withSale['buy(address,uint256)'](investor3.address, ethers.utils.parseEther('500'), {
      value: ethers.utils.parseEther('0.5')
    });

    expect(
      (await admin.withVesting.vesting(investor3.address)).total
    ).to.equal(ethers.utils.parseEther('500'));

    //approve
    await investor4.withUSDC.approve(
      admin.withSale.address,
      10000000
    )

    //buy
    await admin.withSale['buy(address,address,uint256)'](
      admin.withUSDC.address,
      investor4.address, 
      ethers.utils.parseEther('250')
    );

    expect(
      (await admin.withVesting.vesting(investor4.address)).total
    ).to.equal(ethers.utils.parseEther('250'));
  });

  it('Should time travel to May 1, 2024', async function () {
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [1714521601]);
    await ethers.provider.send('evm_mine');
  });

  it('should release all', async function () {
    const { admin, investor1, investor2, investor3 } = this.signers;

    await admin.withVesting.unpause()

    await admin.withVesting.release(investor1.address);
    await admin.withVesting.release(investor2.address);
    await admin.withVesting.release(investor3.address);

    expect(await admin.withToken.balanceOf(investor1.address)).to.equal(ethers.utils.parseEther('100'));
    expect(await admin.withToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther('1000'));
    expect(await admin.withToken.balanceOf(investor3.address)).to.equal(ethers.utils.parseEther('500'));
  });

  it('Should withdraw', async function () {
    const { admin } = this.signers

    const startingBalance = parseFloat(
      ethers.utils.formatEther(await admin.getBalance())
    )

    await admin.withSale['withdraw(address)'](admin.address)
    
    expect(parseFloat(
      ethers.utils.formatEther(await admin.getBalance())
      //also less gas
    ) - startingBalance).to.be.above(1.599)

    await admin.withSale['withdraw(address,address)'](
      admin.withUSDC.address, 
      admin.address
    )

    expect(parseFloat(
        await admin.withUSDC.balanceOf(admin.address)
    )).to.equal(10000000)
  })
});
