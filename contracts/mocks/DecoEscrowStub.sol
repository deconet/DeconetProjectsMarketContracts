pragma solidity 0.4.25;

import "../DecoEscrow.sol";


contract DecoEscrowStub is DecoEscrow {

    address public newOwner;

    function initialize(
        address _newOwner,
        address _authorizedAddress,
        uint8 _shareFee,
        address _relayContractAddress
    )
        external
    {
        newOwner = _newOwner;
        authorizedAddress = _authorizedAddress;
        shareFee = _shareFee;
        relayContractAddress = _relayContractAddress;
    }
}
