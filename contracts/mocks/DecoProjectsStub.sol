pragma solidity 0.4.24;

import "../DecoProjects.sol";


contract DecoProjectsStub is DecoProjects {
    bool public checkIfProjectExistsConfig = true;
    uint8 public projectMilestonesCountConfig = 10;
    uint public projectEndDateConfig = 0;

    bool public projectCompleted = false;

    address public escrowContractStub;
    address public client;
    address public maker;
    address public arbiter;

    function completeProject(bytes32 _agreementHash) external {
        projectCompleted = true;
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

    function checkIfProjectExists(bytes32 _agreementHash) public view returns(bool) {
        return checkIfProjectExistsConfig;
    }

    function getProjectEndDate(bytes32 _agreementHash) public view returns(uint) {
        return projectEndDateConfig;
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

}
