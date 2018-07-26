pragma solidity 0.4.24;

import "./DecoMilestones.sol";
import "./DecoProjects.sol";


contract DecoMilestonesMock is DecoMilestones {

    bool internal canClientTerminateConfig = true;
    bool internal canMakerTerminateConfig = true;

    function setIfClientCanTerminate(bool config) public {
        canClientTerminateConfig = config;
    }

    function setIfMakerCanTerminate(bool config) public {
        canMakerTerminateConfig = config;
    }

    function canClientTerminate(bytes32 _agreementHash) public returns(bool) {
        return canClientTerminateConfig;
    }

    function canMakerTerminate(bytes32 _agreementHash) public returns(bool) {
        return canMakerTerminateConfig;
    }

    function terminateLastMilestone(bytes32 _agreementHash) public {
    }

    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount,
        uint32 _duration
    )
        public
        payable
    {
    }

    function deliverLastMilestone(bytes32 _agreementHash) public {
    }

    function acceptLastMilestone(bytes32 _agreementHash) public {
        if (projectMilestones[_agreementHash].length == 0) {
            DecoProjects projectsContract = DecoProjects(projectContractAddress);
            projectsContract.completeProject(_agreementHash);
        }
    }

    function rejectLastDeliverable(bytes32 _agreementHash) public {
    }

    function setProjectContractAddress(address _newAddress) public {
        projectContractAddress = _newAddress;
    }
}
