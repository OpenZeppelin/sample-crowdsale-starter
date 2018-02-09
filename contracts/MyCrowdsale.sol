pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./MyToken.sol";

contract MyCrowdsale is CappedCrowdsale, FinalizableCrowdsale {

  function MyCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address _wallet) public
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, _wallet)
  {
  }

  // Create a custom token to mint instead of the default MintableToken
  function createTokenContract() internal returns (MintableToken) {
    return new MyToken();
  }

  // Override to indicate when the crowdsale ends and does not accept any more contributions
  // Checks endTime by default, plus cap from CappedCrowdsale
  function hasEnded() public view returns (bool) {
    return super.hasEnded();
  }

  // Override this method to have a way to add business logic to your crowdsale when buying
  // Returns weiAmount times rate by default
  function getTokenAmount(uint256 weiAmount) internal view returns(uint256) {
    return super.getTokenAmount(weiAmount);
  }

  // Override to create custom fund forwarding mechanisms
  // Forwards funds to the specified wallet by default
  function forwardFunds() internal {
    return super.forwardFunds();
  }

  // Criteria for accepting a purchase
  // Make sure to call super.validPurchase(), or all the criteria from parents will be overwritten.
  function validPurchase() internal view returns (bool) {
    return super.validPurchase();
  }

  // Override to execute any logic once the crowdsale finalizes
  // Requires a call to the public finalize method, only after the sale hasEnded
  // Remember that super.finalization() calls the token finishMinting(),
  // so no new tokens can be minted after that
  function finalization() internal {
    super.finalization();
  }
}