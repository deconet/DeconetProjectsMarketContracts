pragma solidity 0.4.25;

import "../DecoMilestones.sol";


contract DecoMilestonesMock is DecoMilestones {
    bool public canClientTerminateConfig = true;
    bool public canMakerTerminateConfig = true;

    bool public shouldSkipContractCanTerminateCall = true;

    function setSkipCanTerminateLogic(bool shouldSkip) public {
        shouldSkipContractCanTerminateCall = shouldSkip;
    }

    function setMockClientCanTerminate(bool canTerminate) public {
        canClientTerminateConfig = canTerminate;
    }

    function setMockMakerCanTerminate(bool canTerminate) public {
        canMakerTerminateConfig = canTerminate;
    }

    function markMilestoneAsCompletedAndAccepted(bytes32 _agreementHash) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        uint nowTimestamp = now;
        milestone.deliveredTime = nowTimestamp;
        milestone.acceptedTime = nowTimestamp + 1;
    }

    function markMilestoneAsDelivered(bytes32 _agreementHash) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        milestone.deliveredTime = now;
    }

    function markMilestoneAsOnHold(bytes32 _agreementHash, bool isOnHold) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        milestone.isOnHold = isOnHold;
    }

    // Overriding the implementation to account some mock-related logic.
    function canClientTerminate(bytes32 _agreementHash) public view returns(bool) {
        if (shouldSkipContractCanTerminateCall) {
            return canClientTerminateConfig;
        } else {
            return super.canClientTerminate(_agreementHash);
        }
    }

    function canMakerTerminate(bytes32 _agreementHash) public view returns(bool) {
        if (shouldSkipContractCanTerminateCall) {
            return canMakerTerminateConfig;
        } else {
            if (super.canMakerTerminate(_agreementHash) == false) {
                return false;
            } else {
                return true;
            }
        }
    }

    function countOfMilestones(bytes32 _agreementHash) public view returns(uint) {
        return projectMilestones[_agreementHash].length;
    }
}
