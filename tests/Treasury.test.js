const { expect, deploy, bindContract, getRole } = require('./utils')

describe('Treasury Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    const treasury = await deploy('Treasury', signers[0].address);
    await bindContract('withTreasury', 'Treasury', treasury, signers);

    const [admin, requester, receiver, approver1, approver2, approver3, approver4, fund1, fund2, fund3] = signers;

    await admin.withTreasury.grantRole(getRole('REQUESTER_ROLE'), requester.address);
    await admin.withTreasury.grantRole(getRole('REQUESTER_ROLE'), approver1.address);
    await admin.withTreasury.grantRole(getRole('APPROVER_ROLE'), approver1.address);
    await admin.withTreasury.grantRole(getRole('APPROVER_ROLE'), approver2.address);
    await admin.withTreasury.grantRole(getRole('APPROVER_ROLE'), approver3.address);
    await admin.withTreasury.grantRole(getRole('APPROVER_ROLE'), approver4.address);

    await fund1.sendTransaction({
      to: admin.withTreasury.address,
      value: ethers.utils.parseEther('10')
    });

    await fund2.sendTransaction({
      to: admin.withTreasury.address,
      value: ethers.utils.parseEther('10')
    });

    await fund3.sendTransaction({
      to: admin.withTreasury.address,
      value: ethers.utils.parseEther('1')
    });

    this.txURI = 'https://ipfs.io/ipfs/Qm123abc';

    this.signers = {
      admin,
      requester,
      receiver,
      approver1,
      approver2,
      approver3,
      approver4
    };
  });

  // it('Should request tx', async function () {
  //   const { requester, receiver } = this.signers;

  //   await expect(requester.withTreasury.request(1, receiver.address, ethers.utils.parseEther('0.05')))
  //     .to.emit(requester.withTreasury, 'FundsRequested')
  //     .withArgs(1);

  //   let tx = await requester.withTreasury.txs(1);

  //   expect(tx.beneficiary).to.equal(receiver.address);
  //   expect(tx.amount).to.equal(ethers.utils.parseEther('0.05'));
  //   expect(tx.approvals).to.equal(0);
  //   expect(tx.withdrawn).to.equal(false);

  //   await expect(requester.withTreasury.request(2, receiver.address, ethers.utils.parseEther('5')))
  //     .to.emit(requester.withTreasury, 'FundsRequested')
  //     .withArgs(2);

  //   tx = await requester.withTreasury.txs(2);

  //   expect(tx.beneficiary).to.equal(receiver.address);
  //   expect(tx.amount).to.equal(ethers.utils.parseEther('5'));
  //   expect(tx.approvals).to.equal(0);
  //   expect(tx.withdrawn).to.equal(false);
  // });

  it('Should error when using the same tx id', async function () {
    const { requester, receiver } = this.signers;
    await expect(requester.withTreasury.request(1, receiver.address, ethers.utils.parseEther('0.5'))).to.be.revertedWith(
      'InvalidCall()'
    );
  });

  it('Should not allow less than minimum request', async function () {
    const { requester, receiver } = this.signers;
    await expect(requester.withTreasury.request(3, receiver.address, ethers.utils.parseEther('0.009'))).to.be.revertedWith(
      'InvalidCall()'
    );
  });

  it('Should error when requesting in a cooldown', async function () {
    const { requester, receiver } = this.signers;
    await expect(requester.withTreasury.request(3, receiver.address, ethers.utils.parseEther('0.05'))).to.be.revertedWith(
      'InvalidCall()'
    );
  });

  // it('Should approve', async function () {
  //   const { admin, approver1, approver2, approver3 } = this.signers;

  //   await expect(approver1.withTreasury.approve(1))
  //     .to.emit(admin.withTreasury, 'FundsApprovedFrom')
  //     .withArgs(approver1.address, 1);

  //   let tx = await admin.withTreasury.txs(2);

  //   await expect(approver2.withTreasury.approve(1)).to.emit(admin.withTreasury, 'FundsApproved').withArgs(1);

  //   tx = await admin.withTreasury.txs(1);
  //   expect(tx.approvals).to.equal(2);
  //   expect(tx.withdrawn).to.equal(false);
  //   expect(await admin.withTreasury.isApproved(1)).to.equal(true);

  //   await expect(approver1.withTreasury.approve(2))
  //     .to.emit(admin.withTreasury, 'FundsApprovedFrom')
  //     .withArgs(approver1.address, 2);

  //   tx = await admin.withTreasury.txs(2);
  //   expect(tx.approvals).to.equal(1);
  //   expect(tx.withdrawn).to.equal(false);
  //   expect(await admin.withTreasury.isApproved(2)).to.equal(false);

  //   await expect(approver2.withTreasury.approve(2))
  //     .to.emit(admin.withTreasury, 'FundsApprovedFrom')
  //     .withArgs(approver2.address, 2);

  //   tx = await admin.withTreasury.txs(2);
  //   expect(tx.approvals).to.equal(2);
  //   expect(tx.withdrawn).to.equal(false);
  //   expect(await admin.withTreasury.isApproved(2)).to.equal(false);

  //   await expect(approver3.withTreasury.approve(2)).to.emit(admin.withTreasury, 'FundsApproved').withArgs(2);

  //   tx = await admin.withTreasury.txs(2);
  //   expect(tx.approvals).to.equal(3);
  //   expect(tx.withdrawn).to.equal(false);
  //   expect(await admin.withTreasury.isApproved(2)).to.equal(true);
  // });

  it('Should error approving non existent request', async function () {
    const { approver1 } = this.signers;
    await expect(approver1.withTreasury.approve(10)).to.be.revertedWith('InvalidCall()');
  });

  it('Should not allow duplicate approving', async function () {
    const { approver1 } = this.signers;
    await expect(approver1.withTreasury.approve(1)).to.be.revertedWith('InvalidCall()');
  });

  // it('Should withdraw', async function () {
  //   const { admin, receiver } = this.signers;

  //   const balance = parseFloat(ethers.utils.formatEther(await receiver.getBalance()));

  //   await expect(admin.withTreasury.withdraw(1)).to.emit(admin.withTreasury, 'FundsWithdrawn').withArgs(1);

  //   expect(parseFloat(ethers.utils.formatEther(await receiver.getBalance())) - balance).to.be.above(0.049);

  //   await expect(admin.withTreasury.withdraw(2)).to.emit(admin.withTreasury, 'FundsWithdrawn').withArgs(2);

  //   expect(parseFloat(ethers.utils.formatEther(await receiver.getBalance())) - balance).to.be.above(5.049);
  // });

  it('Should not allow approving already withdrawn tx', async function () {
    const { approver4 } = this.signers;
    await expect(approver4.withTreasury.approve(1)).to.be.revertedWith('InvalidCall()');
  });

  it('Should not allow requests passed the available funds in the contract', async function () {
    const { requester, receiver } = this.signers;
    await expect(requester.withTreasury.request(3, receiver.address, ethers.utils.parseEther('20'))).to.be.revertedWith(
      'InvalidCall()'
    );
  });

  // it('Should be able to cancel request', async function () {
  //   const { requester, receiver, approver1, approver2 } = this.signers;
  //   await requester.withTreasury.request(3, receiver.address, ethers.utils.parseEther('0.5'));
  //   let tx = await requester.withTreasury.txs(3);
  //   expect(tx.cancelled).to.equal(false);

  //   await expect(requester.withTreasury.cancel(3)).to.emit(requester.withTreasury, 'RequestCancelled').withArgs(3);
  //   tx = await requester.withTreasury.txs(3);
  //   expect(tx.cancelled).to.equal(true);

  //   await requester.withTreasury.request(4, receiver.address, ethers.utils.parseEther('0.5'));

  //   tx = await requester.withTreasury.txs(4);
  //   expect(tx.beneficiary).to.equal(receiver.address);
  //   expect(tx.amount).to.equal(ethers.utils.parseEther('0.5'));
  //   expect(tx.approvals).to.equal(0);
  //   expect(tx.withdrawn).to.equal(false);
  //   expect(tx.cancelled).to.equal(false);

  //   await approver1.withTreasury.approve(4);
  //   await approver2.withTreasury.approve(4);
  // });

  // it('Should error when withdrawing the available funds in the contract', async function () {
  //   const { admin, approver1, approver2, approver3, approver4, requester, receiver } = this.signers;

  //   await requester.withTreasury.request(5, receiver.address, ethers.utils.parseEther('15.9'));
  //   await approver1.withTreasury.approve(5);
  //   await approver2.withTreasury.approve(5);
  //   await approver3.withTreasury.approve(5);
  //   await approver4.withTreasury.approve(5);
  //   await admin.withTreasury.withdraw(5);
  //   await expect(admin.withTreasury.withdraw(4)).to.be.revertedWith('InvalidCall()');
  // });
});
