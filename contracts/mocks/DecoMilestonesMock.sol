pragma solidity 0.4.24;

import "../DecoMilestones.sol";


contract DecoMilestonesMock is DecoMilestones {
    function markMilestoneAsCompletedAndAccepted(bytes32 _agreementHash) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        milestone.deliveryTime = now + milestone.duration;
        milestone.isAccepted = true;
    }

    function markMilestoneAsDelivered(bytes32 _agreementHash) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        milestone.deliveryTime = now + milestone.duration;
    }

    function markMilestoneAsOnHold(bytes32 _agreementHash, bool isOnHold) public {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        require(milestones.length > 0);
        Milestone storage milestone = milestones[milestones.length - 1];
        milestone.isOnHold = isOnHold;
    }
}
