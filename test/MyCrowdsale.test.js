import ether from './helpers/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const MyCrowdsale = artifacts.require('MyCrowdsale');
const MyToken = artifacts.require('MyToken');

contract('MyCrowdsale', function ([owner, wallet, investor, otherInvestor]) {
  const RATE = new BigNumber(10);
  const CAP = ether(20);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.crowdsale = await MyCrowdsale.new(this.startTime, this.endTime, RATE, CAP, wallet);
    this.token = MyToken.at(await this.crowdsale.token());
  });

  it('should create crowdsale with correct parameters', async function () {
    this.crowdsale.should.exist;
    this.token.should.exist;

    const startTime = await this.crowdsale.startTime();
    const endTime = await this.crowdsale.endTime();
    const rate = await this.crowdsale.rate();
    const walletAddress = await this.crowdsale.wallet();
    const cap = await this.crowdsale.cap();

    startTime.should.be.bignumber.equal(this.startTime);
    endTime.should.be.bignumber.equal(this.endTime);
    rate.should.be.bignumber.equal(RATE);
    walletAddress.should.be.equal(wallet);
    cap.should.be.bignumber.equal(CAP);
  });

  it('should not accept payments before start', async function () {
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { from: investor, value: ether(1) }).should.be.rejectedWith(EVMRevert);
  });

  it('should accept payments during the sale', async function () {
    const investmentAmount = ether(1);
    const expectedTokenAmount = RATE.mul(investmentAmount);

    await increaseTimeTo(this.startTime);
    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
    (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
  });

  it('should reject payments after end', async function () {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { value: ether(1), from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should reject payments over cap', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.send(CAP);
    await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
  });

  it.skip('should grant an extra 10% tokens as bonus for contributions over 5 ETH', async function () {
    const investmentAmount = ether(1);
    const largeInvestmentAmount = ether(10);
    const expectedTokenAmount = RATE.mul(investmentAmount);
    const expectedLargeTokenAmount = RATE.mul(largeInvestmentAmount).mul(1.1);

    await increaseTimeTo(this.startTime);
    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;
    await this.crowdsale.buyTokens(otherInvestor, { value: largeInvestmentAmount, from: otherInvestor }).should.be.fulfilled;

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
    (await this.token.balanceOf(otherInvestor)).should.be.bignumber.equal(expectedLargeTokenAmount);
    (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount.add(expectedLargeTokenAmount));
  });

  it.skip('should mint 20% of total emitted tokens for the owner wallet upon finish', async function () {
    const totalInvestmentAmount = ether(10);

    await increaseTimeTo(this.startTime);
    await this.crowdsale.buyTokens(investor, { value: totalInvestmentAmount, from: investor });
    await increaseTimeTo(this.endTime + 1);
    const totalTokenAmount = await this.token.totalSupply();

    await this.crowdsale.finalize();
    (await this.token.balanceOf(wallet)).should.be.bignumber.equal(totalTokenAmount * 0.2);
  });

  it.skip('should only allow whitelisted users to participate', async function () {
    const investmentAmount = ether(1);
    const expectedTokenAmount = RATE.mul(investmentAmount);

    // Requires implementing a whitelist(address) public function in the MyCrowdsale contract
    await this.crowdsale.whitelist(investor, { from: owner });
    await increaseTimeTo(this.startTime);

    await this.crowdsale.buyTokens(otherInvestor, { value: ether(1), from: otherInvestor }).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { value: ether(1), from: investor }).should.be.fulfilled;

    const investorBalance = await this.token.balanceOf(investor);
    investorBalance.should.be.bignumber.equal(expectedTokenAmount);
  });

  it.skip('should only allow the owner to whitelist an investor', async function () {
    // Check out the Ownable.sol contract to see if there is a modifier that could help here
    await this.crowdsale.whitelist(investor, { from: investor }).should.be.rejectedWith(EVMRevert);
  })

});
