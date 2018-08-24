pragma solidity 0.4.24;

import "./DecoEscrow.sol";


contract DecoEscrowStub is DecoEscrow {

    address public newOwner;
    address[] public authorizedAddresses;

    function initialize(address _newOwner, address[] _authorizedAddresses) external {
        newOwner = _newOwner;
        for(uint i = 0; i < _authorizedAddresses.length; i++) {
            authorizedAddresses.push(_authorizedAddresses[i]);
        }
    }
}
