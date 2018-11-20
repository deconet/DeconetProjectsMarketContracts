pragma solidity 0.4.24;

import "./DecoEscrow.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@optionality.io/clone-factory/contracts/CloneFactory.sol";


/**
 * @title Utility contract that provides a way to execute cheap clone deployment of the DecoEscrow contract
 *        on chain.
 */
contract DecoEscrowFactory is DecoBaseProjectsMarketplace, CloneFactory {

    // Escrow master-contract address.
    address public libraryAddress;

    // Logged when a new Escrow clone is deployed to the chain.
    event EscrowCreated(address newEscrowAddress);

    /**
     * @dev Constructor for the contract.
     * @param _libraryAddress Escrow master-contract address.
     */
    constructor(address _libraryAddress) public {
        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Updates library address with the given value.
     * @param _libraryAddress Address of a new base contract.
     */
    function setLibraryAddress(address _libraryAddress) external onlyOwner {
        require(libraryAddress != _libraryAddress);
        require(_libraryAddress != address(0x0));

        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Create Escrow clone.
     * @param _ownerAddress An address of the Escrow contract owner.
     * @param _authorizedAddress An addresses that is going to be authorized in Escrow contract.
     */
    function createEscrow(
        address _ownerAddress,
        address _authorizedAddress
    )
        external
        returns(address)
    {
        address clone = createClone(libraryAddress);
        DecoRelay relay = DecoRelay(relayContractAddress);
        DecoEscrow(clone).initialize(
            _ownerAddress,
            _authorizedAddress,
            relay.shareFee(),
            relayContractAddress
        );
        emit EscrowCreated(clone);
        return clone;
    }
}
