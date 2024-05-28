const { expect, deploy, bindContract, getRole } = require('./utils')

describe('StableSwap Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    const token = await deploy('Token', signers[0].address);
    await bindContract('withToken', 'Token', token, signers);
    const treasury = await deploy('Treasury', signers[0].address);
    await bindContract('withTreasury', 'Treasury', treasury, signers);
    const swap = await deploy(
      'TokenSwap', 
      token.address, 
      treasury.address, 
      ethers.utils.parseEther('5000'), 
      signers[0].address
    );
    await bindContract('withSwap', 'TokenSwap', swap, signers);

    const [ admin, user1, user2, user3, user4, fund ] = signers;

    //set admin roles
    await admin.withToken.grantRole(getRole('PAUSER_ROLE'), admin.address);
    await admin.withToken.grantRole(getRole('MINTER_ROLE'), admin.address);
    await admin.withSwap.grantRole(getRole('CURATOR_ROLE'), admin.address);

    //send swap 10 ether
    await admin.withSwap.unpause();
    await fund.sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther('10')
    });

    //send swap 5000 tokens
    await admin.withToken.unpause();
    await admin.withToken.mint(
      admin.withSwap.address, 
      ethers.utils.parseEther('5000')
    );

    this.signers = { admin, user1, user2, user3, user4 };
  });

  it('Should have a balance', async function () {
    const { admin } = this.signers;

    expect(//admin to have 10 eth
      await admin.withSwap.balanceEther()
    ).to.equal(ethers.utils.parseEther('10'));

    expect(//swap to have 10 eth
      await admin.withSwap.provider.getBalance(admin.withSwap.address)
    ).to.equal(ethers.utils.parseEther('10'));

    expect(//swap to have 5000 token 
      await admin.withToken.balanceOf(admin.withSwap.address)
    ).to.equal(ethers.utils.parseEther('5000'));

    expect(//swap to have 100 token
      await admin.withSwap.balanceToken()
    ).to.equal(ethers.utils.parseEther('5000'));
  });

  it('Should have a buy and sell price', async function () {
    const { admin } = this.signers;

    expect(//10 / 10,000 = 0.001
      await admin.withSwap.tokenValue()
    ).to.equal(ethers.utils.parseEther('0.001'));

    expect(//10 / 10,000 = 0.001 * 50% = 0.0005
      await admin.withSwap.buyingFor(ethers.utils.parseEther('1'))
    ).to.equal(ethers.utils.parseEther('0.0005'));

    expect(//10 / 10,000 = 0.001 * 200% = 0.002
      await admin.withSwap.sellingFor(ethers.utils.parseEther('1'))
    ).to.equal(ethers.utils.parseEther('0.002'));
  });

  it('Should buy', async function () {
    const { admin, user1 } = this.signers;

    //buy 500 tokens
    await admin.withSwap.buy(user1.address, ethers.utils.parseEther('500'), {
      value: ethers.utils.parseEther('1')
    });

    expect(//user1 to have 500 tokens
      await admin.withToken.balanceOf(user1.address)
    ).to.equal(ethers.utils.parseEther('500'));

    expect(//swap to have 10 + (1 / 2)
      await admin.withSwap.balanceEther()
    ).to.equal(ethers.utils.parseEther('10.5'));

    expect(//swap to have 10 + (1 / 2)
      await admin.provider.getBalance(admin.withSwap.address)
    ).to.equal(ethers.utils.parseEther('10.5'));

    expect(//treasury to have 0.02 / 2 (50% interest)
      await admin.provider.getBalance(admin.withTreasury.address)
    ).to.equal(ethers.utils.parseEther('0.5'));

    expect(//swap to have 4500 tokens
      await admin.withSwap.balanceToken()
    ).to.equal(ethers.utils.parseEther('4500'));

    this.buyingFor = await admin.withSwap.buyingFor(
      ethers.utils.parseEther('1')
    )

    this.sellingFor = await admin.withSwap.sellingFor(
      ethers.utils.parseEther('1')
    )

    //buying for 0.0005
    expect(this.buyingFor).to.equal(ethers.utils.parseEther('0.0005'))
    //selling for 0.002
    expect(this.sellingFor).to.equal(ethers.utils.parseEther('0.002'))
  });

  it('Should sell', async function () {
    const { admin, user1 } = this.signers;

    //allow token to tx 500 tokens
    await user1.withToken.approve(
      admin.withSwap.address, 
      ethers.utils.parseEther('500')
    );

    await admin.withSwap.sell(user1.address, ethers.utils.parseEther('500'));

    expect(//user 1 to have 0 tokens
      await admin.withToken.balanceOf(user1.address)
    ).to.equal(0);

    expect(//swap to have less eth
      await admin.withSwap.balanceEther()
    ).to.equal(ethers.utils.parseEther('10.25'));

    expect(//swap to have less eth
      await admin.provider.getBalance(admin.withSwap.address)
    ).to.equal(
      ethers.utils.parseEther('10.25')
    );

    expect(//no balance change in treasury
      await admin.provider.getBalance(admin.withTreasury.address)
    ).to.equal(ethers.utils.parseEther('0.5'));

    expect(//swap to have 500 more token
      await admin.withSwap.balanceToken()
    ).to.equal(ethers.utils.parseEther('5000'));
  });
});
