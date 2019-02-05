pragma solidity 0.5.3;

import "./DecoBaseProjectsMarketplace.sol";
import "./DecoProjects.sol";
import "./DecoMilestones.sol";
import "./DecoEscrowFactory.sol";
import "./DecoArbitration.sol";


/// @title Contract to store other contracts newest versions addresses and service information.
contract DecoRelay is DecoBaseProjectsMarketplace {
    DecoProjects public projectsContract;
    DecoMilestones public milestonesContract;
    DecoEscrowFactory public escrowFactoryContract;
    DecoArbitration public arbitrationContract;

    address payable public feesWithdrawalAddress;

    uint8 public shareFee;

    function setProjectsContract(DecoProjects _newContract) external onlyOwner {
        require(address(_newContract) != address(0x0), "Address should not be 0x0.");
        projectsContract = _newContract;
    }

    function setMilestonesContract(DecoMilestones _newContract) external onlyOwner {
        require(address(_newContract) != address(0x0), "Address should not be 0x0.");
        milestonesContract = _newContract;
    }

    function setEscrowFactoryContract(DecoEscrowFactory _newContract) external onlyOwner {
        require(address(_newContract) != address(0x0), "Address should not be 0x0.");
        escrowFactoryContract = _newContract;
    }

    function setArbitrationContract(DecoArbitration _newContract) external onlyOwner {
        require(address(_newContract) != address(0x0), "Address should not be 0x0.");
        arbitrationContract = _newContract;
    }

    function setFeesWithdrawalAddress(address payable _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Address should not be 0x0.");
        feesWithdrawalAddress = _newAddress;
    }

    function setShareFee(uint8 _shareFee) external onlyOwner {
        require(_shareFee <= 100, "Deconet share fee must be less than 100%.");
        shareFee = _shareFee;
    }
}
