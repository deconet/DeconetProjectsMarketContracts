pragma solidity 0.5.3;

import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";


/// @title Base projects marketplace contract that contains shared logic.
contract DecoRelayAccessProxy is DecoBaseProjectsMarketplace {

    // `DecoRelay` contract.
    DecoRelay public relayContract;

    /**
     * @dev Set the new the `DecoRelay` contract.
     * @param _newRelayContract An instance of the new contract.
     */
    function setRelayContract(DecoRelay _newRelayContract) public onlyOwner {
        require(address(_newRelayContract) != address(0x0), "Relay address must not be 0x0.");
        relayContract = _newRelayContract;
    }
}
