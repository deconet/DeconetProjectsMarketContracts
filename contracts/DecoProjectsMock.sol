pragma solidity 0.4.24;

import "./DecoProjects.sol";


contract DecoProjectsMock is DecoProjects {

    event MockCloningTestEvent(address newCloneAddress);

    function testDeployEscrowClone(address _newOwner) public {
        address cloneAddress = deployEscrowClone(_newOwner);
        emit MockCloningTestEvent(cloneAddress);
    }
}
