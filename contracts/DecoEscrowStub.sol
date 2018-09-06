pragma solidity 0.4.24;

import "./DecoEscrow.sol";


contract DecoEscrowStub is DecoEscrow {

    address public newOwner;

    function initialize(address _newOwner, address _authorizedAddress) external {
        newOwner = _newOwner;
        authorizedAddress = _authorizedAddress;
    }
}
