pragma solidity 0.4.24;

import "../DecoProjects.sol";
import "../DecoRelay.sol";
import "../DecoMilestones.sol";


contract DecoProjectsStub is DecoProjects {
    bool public checkIfProjectExistsConfig = true;
    uint8 public projectMilestonesCountConfig = 10;
    uint public projectEndDateConfig = 0;
    uint public projectStartDateConfig = 0;

    bool public projectCompleted = false;

    address public escrowContractStub;
    address public client;
    address public maker;
    address public arbiter;

    uint8 public feedbackWindow;
    uint8 public milestoneStartWindow;

    uint public arbiterFixedFee;
    uint8 public arbiterShareFee;

    function completeProject(bytes32) external {
        projectCompleted = true;
        projectEndDateConfig = now;
    }

    function terminateProject(bytes32 _agreementHash) external {
        DecoRelay relayContract = DecoRelay(relayContractAddress);
        DecoMilestones milestonesContract = DecoMilestones(relayContract.milestonesContractAddress());
        if (msg.sender != relayContract.milestonesContractAddress()) {
            milestonesContract.terminateLastMilestone(_agreementHash, msg.sender);
        } else {
            projectEndDateConfig = now;
        }
    }

    function setProjectCompleted(bool value) public {
        projectCompleted = value;
    }

    function setIsProjectExistingConfig(bool config) public {
        checkIfProjectExistsConfig = config;
    }

    function setProjectMilestonesCountConfig(uint8 config) public {
        projectMilestonesCountConfig = config;
    }

    function setProjectEndDateConfig(uint config) public {
        projectEndDateConfig = config;
    }

    function setProjectStartDateConfig(uint config) public {
        projectStartDateConfig = config;
    }

    function setEscrowContractStubAddress(address newAddress) public {
        escrowContractStub = newAddress;
    }

    function setProjectClient(address newAddress) public {
        client = newAddress;
    }

    function setProjectMaker(address newAddress) public {
        maker = newAddress;
    }

    function setProjectArbiter(address newAddress) public {
        arbiter = newAddress;
    }

    function setProjectFeedbackWindow(uint8 _window) public {
        feedbackWindow = _window;
    }

    function setProjectMilestoneStartWindow(uint8 _window) public {
        milestoneStartWindow = _window;
    }

    function setArbiterFees(uint fixedFee, uint8 shareFee) public {
        arbiterFixedFee = fixedFee;
        arbiterShareFee = shareFee;
    }

    function checkIfProjectExists(bytes32) public view returns(bool) {
        return checkIfProjectExistsConfig;
    }

    function getProjectEndDate(bytes32) public view returns(uint) {
        return projectEndDateConfig;
    }

    function getProjectStartDate(bytes32) public view returns(uint) {
        return projectStartDateConfig;
    }

    function getProjectMilestonesCount(bytes32) public view returns(uint8) {
        return projectMilestonesCountConfig;
    }

    function getProjectEscrowAddress(bytes32) public view returns(address) {
        return escrowContractStub;
    }

    function getProjectClient(bytes32) public view returns(address) {
        return client;
    }

    function getProjectMaker(bytes32) public view returns(address) {
        return maker;
    }

    function getProjectArbiter(bytes32) public view returns(address) {
        return arbiter;
    }

    function getProjectFeedbackWindow(bytes32) public view returns(uint8) {
        return feedbackWindow;
    }

    function getProjectMilestoneStartWindow(bytes32) public view returns(uint8) {
        return milestoneStartWindow;
    }

    function getProjectArbitrationFees(bytes32) public view returns(uint, uint8) {
        return (
            arbiterFixedFee,
            arbiterShareFee
        );
    }

    function getInfoForDisputeAndValidate(
        bytes32 _agreementHash,
        address _respondent,
        address _initiator,
        address _arbiter
    )
        public
        view
        returns(uint, uint8, address)
    {
        require(arbiter == _arbiter, "Arbiter should be same as saved in project.");
        require(
            (_initiator == client && _respondent == maker) ||
            (_initiator == maker && _respondent == client),
            "Initiator and respondent must be different and equal to maker/client addresses."
        );
        return (arbiterFixedFee, arbiterShareFee, escrowContractStub);
    }
}
