pragma solidity 0.4.24;

import "./DecoBaseProjectsMarketplace.sol";


contract DecoRelay is DecoBaseProjectsMarketplace {
    address public projectsContractAddress;
    address public milestonesContractAddress;
    address public escrowFactoryContractAddress;
    address public arbitrationContractAddress;

    address public feesWithdrawalAddress;

    uint8 public shareFee;

    function setProjectsContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        projectsContractAddress = _newAddress;
    }

    function setMilestonesContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        milestonesContractAddress = _newAddress;
    }

    function setEscrowFactoryContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        escrowFactoryContractAddress = _newAddress;
    }

    function setArbitrationContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        arbitrationContractAddress = _newAddress;
    }

    function setFeesWithdrawalAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        feesWithdrawalAddress = _newAddress;
    }

    function setShareFee(uint8 _shareFee) external onlyOwner {
        require(_shareFee <= 100, "Deconet share fee must be less than 100%.");
        shareFee = _shareFee;
    }
}
