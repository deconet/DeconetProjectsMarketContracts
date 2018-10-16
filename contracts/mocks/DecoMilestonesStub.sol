pragma solidity 0.4.24;

import "../DecoMilestones.sol";
import "../DecoProjects.sol";


contract DecoMilestonesStub is DecoMilestones {

    bool internal canClientTerminateConfig = true;
    bool internal canMakerTerminateConfig = true;
    bool internal isLastMilestoneAcceptedConfig = true;
    uint8 internal lastMilestoneNumberConfig = 10;
    address internal projectOwnerAddress = address(0x0);

    function terminateLastMilestone(bytes32 _agreementHash) external {
    }

    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount,
        uint32 _duration
    )
        external
        payable
    {
    }

    function deliverLastMilestone(bytes32 _agreementHash) external {
    }

    function acceptLastMilestone(bytes32 _agreementHash) external {
        require(msg.sender == projectOwnerAddress);
        if (projectMilestones[_agreementHash].length == 0) {
            DecoProjects projectsContract = DecoProjects(
                DecoRelay(relayContractAddress).projectsContractAddress()
            );
            projectsContract.completeProject(_agreementHash);
        }
    }

    function rejectLastDeliverable(bytes32 _agreementHash) external {
    }

    function setRelayContractAddress(address _newAddress) external {
        relayContractAddress = _newAddress;
    }

    function setIfClientCanTerminate(bool config) public {
        canClientTerminateConfig = config;
    }

    function setIfMakerCanTerminate(bool config) public {
        canMakerTerminateConfig = config;
    }

    function setIsLastMilestoneAccepted(bool config) public {
        isLastMilestoneAcceptedConfig = config;
    }

    function setLastMilestoneNumber(uint8 config) public {
        lastMilestoneNumberConfig = config;
    }

    function setProjectOwnerAddress(address _newAddress) public {
        projectOwnerAddress = _newAddress;
    }

    function canClientTerminate(bytes32 _agreementHash) public returns(bool) {
        return canClientTerminateConfig;
    }

    function canMakerTerminate(bytes32 _agreementHash) public returns(bool) {
        return canMakerTerminateConfig;
    }

    function isLastMilestoneAccepted(
        bytes32 _agreementHash
    )
        public
        returns(bool isAccepted, uint8 milestoneNumber)
    {
        return (isLastMilestoneAcceptedConfig, lastMilestoneNumberConfig);
    }
}
