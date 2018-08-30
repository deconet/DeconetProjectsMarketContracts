pragma solidity 0.4.24;

import "./DecoProjects.sol";


contract DecoProjectsStub is DecoProjects {
    bool public checkIfProjectExistsConfig = true;
    uint8 public projectMilestonesCountConfig = 10;

    function setIsProjectExistingConfig(bool config) public {
        checkIfProjectExistsConfig = config;
    }

    function setProjectMilestonesCountConfig(uint8 config) public {
        projectMilestonesCountConfig = config;
    }

    function checkIfProjectExists(bytes32 _agreementHash) public view returns(bool) {
        return checkIfProjectExistsConfig;
    }

    function getProjectMilestonesCount(bytes32 _agreementHash) public view returns(uint8) {
        return projectMilestonesCountConfig;
    }
}
