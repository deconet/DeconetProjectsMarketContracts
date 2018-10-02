pragma solidity 0.4.24;

import "./IDecoArbitrationTarget.sol";


contract DecoArbitrationTargetStub is IDecoArbitrationTarget {

    bool public canStartDispute;

    bool public disputeStarted;

    bool public disputeEnded;

    bool public isEligibleForDoingAnythingWithDispute;

    function disputeStartedFreeze(bytes32 idHash) external {
        disputeStarted = true;
    }

    function disputeSettledTerminate(bytes32 idHash, uint8[] payoutShares) external {
        disputeEnded = true;
    }

    function checkEligibility(bytes32 idHash, address addressToCheck) external view returns(bool) {
        return isEligibleForDoingAnythingWithDispute;
    }

    function canStartDispute(bytes32 idHash) external view returns(bool) {
        return canStartDispute;
    }

    function setEligibility(bool eligibility) public {
        isEligibleForDoingAnythingWithDispute = eligibility;
    }

    function setIfCanStartDispute(bool canStart) public {
        canStartDispute = canStart;
    }

    function resetState() public {
        disputeStarted = false;
        disputeEnded = false;
        canStartDispute = false;
        isEligibleForDoingAnythingWithDispute = false;
    }
}
