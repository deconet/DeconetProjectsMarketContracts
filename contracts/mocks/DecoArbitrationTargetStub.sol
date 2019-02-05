pragma solidity 0.5.3;

import "../IDecoArbitrationTarget.sol";


contract DecoArbitrationTargetStub is IDecoArbitrationTarget {

    bool public canStartDisputeConfig;

    bool public disputeStarted;

    bool public disputeEnded;

    mapping(bytes32 => bool) public endedInternaly;

    mapping(address => bool) public isEligibleForDoingAnythingWithDispute;

    function disputeStartedFreeze(bytes32) public {
        disputeStarted = true;
    }

    function disputeSettledTerminate(
        bytes32 idHash,
        address,
        uint8,
        address,
        uint8,
        bool isInternal,
        address payable
    )
        public
    {
        disputeEnded = true;
        endedInternaly[idHash] = isInternal;
    }

    function checkEligibility(bytes32, address addressToCheck) public view returns(bool) {
        return isEligibleForDoingAnythingWithDispute[addressToCheck];
    }

    function canStartDispute(bytes32) public view returns(bool) {
        return canStartDisputeConfig;
    }

    function setEligibility(bool eligibility, address target) public {
        isEligibleForDoingAnythingWithDispute[target] = eligibility;
    }

    function setIfCanStartDispute(bool canStart) public {
        canStartDisputeConfig = canStart;
    }

    function resetState() public {
        disputeStarted = false;
        disputeEnded = false;
    }
}
