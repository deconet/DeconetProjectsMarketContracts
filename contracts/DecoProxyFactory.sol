pragma solidity 0.4.25;

import "./DecoProxy.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "../node_modules/@optionality.io/clone-factory/contracts/CloneFactory.sol";


/**
 * @title Utility contract that provides a way to execute cheap clone deployment of the DecoProxy contract
 *        on chain.
 */
contract DecoProxyFactory is DecoBaseProjectsMarketplace, CloneFactory {

    // Proxy master-contract address.
    address public libraryAddress;

    // Logged when a new Escrow clone is deployed to the chain.
    event ProxyCreated(address newProxyAddress);

    /**
     * @dev Constructor for the contract.
     * @param _libraryAddress Proxy master-contract address.
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
     * @dev Create Proxy clone.
     * @param _ownerAddress An address of the Proxy contract owner.
     * @param _authorizedAddress An addresses that is going to be authorized in Proxy contract.
     */
    function createProxy(
        address _ownerAddress,
        address _authorizedAddress
    )
        external
        returns(address)
    {
        address clone = createClone(libraryAddress);
        DecoProxy(clone).initialize(
            _authorizedAddress,
            _ownerAddress
        );
        emit ProxyCreated(clone);
        return clone;
    }
}