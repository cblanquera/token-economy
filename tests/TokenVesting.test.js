const { expect, deploy, bindContract, getRole } = require('./utils')

describe('TokenVesting Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    const token = await deploy('Token', signers[0].address);
    await bindContract('withToken', 'Token', token, signers);
    const vesting = await deploy('TokenVesting', token.address, signers[0].address);
    await bindContract('withVesting', 'TokenVesting', vesting, signers);

    const [admin, investor1, investor2, investor3, investor4] = signers;

    await admin.withToken.grantRole(getRole('MINTER_ROLE'), vesting.address);
    await admin.withVesting.grantRole(getRole('VESTER_ROLE'), admin.address);
    await admin.withVesting.grantRole(getRole('PAUSER_ROLE'), admin.address);

    this.signers = {
      admin,
      investor1,
      investor2,
      investor3,
      investor4
    };
    this.now = Math.floor(Date.now() / 1000)
  });

  it('Should vest', async function () {
    const { admin, investor1, investor2 } = this.signers
    await admin.withVesting.vest(
      investor1.address, 
      ethers.utils.parseEther('100'),
      this.now,
      this.now + (3600 * 24 * 30)
    )

    const info1 = await admin.withVesting.vesting(investor1.address)

    expect(info1.startDate).to.equal(this.now)
    expect(info1.endDate).to.equal(this.now + (3600 * 24 * 30))
    expect(info1.total).to.equal(ethers.utils.parseEther('100'))

    expect(
      await admin.withVesting.totalVestedAmount(
        investor1.address,
        this.now + (3600 * 24 * 30)
      )
    ).to.equal(ethers.utils.parseEther('100'))

    //------

    await admin.withVesting.vest(
      investor2.address, 
      ethers.utils.parseEther('200'),
      this.now,
      this.now + (3600 * 24 * 15)
    )
  
    const info2 = await admin.withVesting.vesting(investor2.address)

    expect(info2.startDate).to.equal(this.now)
    expect(info2.endDate).to.equal(this.now + (3600 * 24 * 15))
    expect(info2.total).to.equal(ethers.utils.parseEther('200'))
    
    expect(
      await admin.withVesting.totalVestedAmount(
        investor2.address,
        this.now + (3600 * 24 * 15)
      )
    ).to.equal(ethers.utils.parseEther('200'))
  })

  it('Should time travel 15 days', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_increaseTime', [3600 * 24 * 15]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should release', async function () {
    const { admin, investor1, investor2 } = this.signers

    await admin.withVesting.unpause()

    await admin.withVesting.release(investor1.address)
    expect(await admin.withToken.balanceOf(investor1.address)).to.be.above(
      ethers.utils.parseEther('50')
    )

    //-------

    await admin.withVesting.release(investor2.address)
    expect(await admin.withToken.balanceOf(investor2.address)).to.equal(
      ethers.utils.parseEther('200')
    )
  })
});
