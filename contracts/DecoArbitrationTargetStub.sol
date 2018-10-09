pragma solidity 0.4.24;

import "./IDecoArbitrationTarget.sol";


contract DecoArbitrationTargetStub is IDecoArbitrationTarget {

    bool public canStartDispute;

    bool public disputeStarted;

    bool public disputeEnded;

    mapping(bytes32 => bool) public endedInternaly;

    mapping(address => bool) public isEligibleForDoingAnythingWithDispute;

    function disputeStartedFreeze(bytes32 idHash) external {
        disputeStarted = true;
    }

    function disputeSettledTerminate(
        bytes32 idHash,
        address respondent,
        uint8 respondentShare,
        address initiator,
        uint8 initiatorShare,
        bool isInternal,
        address arbiterWithdrawalAddress
    ) external {
        disputeEnded = true;
        endedInternaly[idHash] = isInternal;
    }

    function checkEligibility(bytes32 idHash, address addressToCheck) external view returns(bool) {
        return isEligibleForDoingAnythingWithDispute[addressToCheck];
    }

    function canStartDispute(bytes32 idHash) external view returns(bool) {
        return canStartDispute;
    }

    function setEligibility(bool eligibility, address target) public {
        isEligibleForDoingAnythingWithDispute[target] = eligibility;
    }

    function setIfCanStartDispute(bool canStart) public {
        canStartDispute = canStart;
    }

    function resetState() public {
        disputeStarted = false;
        disputeEnded = false;
    }
}
