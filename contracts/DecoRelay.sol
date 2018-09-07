pragma solidity 0.4.24;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract DecoRelay is Ownable {
    address public projectsContractAddress;
    address public milestonesContractAddress;
    address public escrowFactoryContractAddress;

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
}
