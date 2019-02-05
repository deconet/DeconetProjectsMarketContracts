pragma solidity 0.5.3;

import "../DecoEscrow.sol";
import "../DecoRelay.sol";


contract DecoEscrowStub is DecoEscrow {

    address public newOwner;

    function initialize(
        address _newOwner,
        address _authorizedAddress,
        uint8 _shareFee,
        DecoRelay _relayContract
    )
        external
    {
        newOwner = _newOwner;
        authorizedAddress = _authorizedAddress;
        shareFee = _shareFee;
        relayContract = _relayContract;
    }
}
