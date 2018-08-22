pragma solidity 0.4.24;

import "./DecoEscrow.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "@optionality.io/clone-factory/contracts/CloneFactory.sol";


contract DecoEscrowFactory is Ownable, CloneFactory {

    // Escrow master-contract address.
    address public libraryAddress;

    // Logged when a new Escrow clone is deployed to the chain.
    event EscrowCreated(address newEscrowAddress);

    /**
     * @dev Constructor for the contract.
     * @param _libraryAddress Escrow master-contract address.
     */
    constructor(address _libraryAddress) {
        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Updates library address with the given value.
     * @param _libraryAddress Address of a new base contract.
     */
    function setLibraryAddress(address _libraryAddress) external onlyOwner {
        require(libraryAddress != _libraryAddress);
        require(_libraryAddress != address(0x0));
        require(_libraryAddress != address(this));

        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Create Escrow clone.
     */
    function createEscrow(
        address _ownerAddress,
        bytes32 agreementIdHash,
        address _milestonesContractAddress
    )
        external
    {
    }
}
