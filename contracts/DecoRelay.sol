pragma solidity 0.4.24;

import "./DecoBaseProjectsMarketplace.sol";


contract DecoRelay is DecoBaseProjectsMarketplace {
    address public projectsContractAddress;
    address public milestonesContractAddress;
    address public escrowFactoryContractAddress;
    address public arbitrationContractAddress;

    function setProjectsContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        projectsContractAddress = _newAddress;
    }

    function setMilestonesContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        milestonesContractAddress = _newAddress;
    }

    function setEscrowFactoryContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        escrowFactoryContractAddress = _newAddress;
    }

    function setArbitrationContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        arbitrationContractAddress = _newAddress;
    }
}
