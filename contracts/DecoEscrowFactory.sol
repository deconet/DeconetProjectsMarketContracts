pragma solidity 0.4.24;

import "./DecoEscrow.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "@optionality.io/clone-factory/contracts/CloneFactory.sol";


contract DecoEscrowFactory is Ownable, CloneFactory {

    address public libraryAddress;

    event EscrowCreated(address newEscrowAddress);

    constructor(address _libraryAddress) {
        libraryAddress = _libraryAddress;
    }

    function setLibraryAddress(address _libraryAddress) external onlyOwner {
        require(libraryAddress != _libraryAddress);
        require(_libraryAddress != address(0x0));
        require(_libraryAddress != address(this));

        libraryAddress = _libraryAddress;
    }

    function createEscrow(
        address _ownerAddress,
        bytes32 agreementIdHash,
        address _milestonesContractAddress
    )
        external
    {
    }
}
