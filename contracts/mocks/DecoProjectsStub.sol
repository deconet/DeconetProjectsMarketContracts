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

    function completeProject(bytes32 _agreementHash) external {
        projectCompleted = true;
        projectEndDateConfig = now;
    }

    function terminateProject(bytes32 _agreementHash) external {
        DecoRelay relayContract = DecoRelay(relayContractAddress);
        DecoMilestones milestonesContract = DecoMilestones(relayContract.milestonesContractAddress());
        milestonesContract.terminateLastMilestone(_agreementHash, msg.sender);
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

    function checkIfProjectExists(bytes32 _agreementHash) public view returns(bool) {
        return checkIfProjectExistsConfig;
    }

    function getProjectEndDate(bytes32 _agreementHash) public view returns(uint) {
        return projectEndDateConfig;
    }

    function getProjectStartDate(bytes32 _agreementHash) public view returns(uint) {
        return projectStartDateConfig;
    }

    function getProjectMilestonesCount(bytes32 _agreementHash) public view returns(uint8) {
        return projectMilestonesCountConfig;
    }

    function getProjectEscrowAddress(bytes32 _agreementHash) public view returns(address) {
        return escrowContractStub;
    }

    function getProjectClient(bytes32 _agreementHash) public view returns(address) {
        return client;
    }

    function getProjectMaker(bytes32 _agreementHash) public view returns(address) {
        return maker;
    }

    function getProjectArbiter(bytes32 _agreementHash) public view returns(address) {
        return arbiter;
    }

    function getProjectFeedbackWindow(bytes32 _agreementHash) public view returns(uint8) {
        return feedbackWindow;
    }

    function getProjectMilestoneStartWindow(bytes32 _agreementHash) public view returns(uint8) {
        return milestoneStartWindow;
    }
}
