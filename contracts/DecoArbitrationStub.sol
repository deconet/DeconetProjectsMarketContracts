pragma solidity 0.4.24;

import "./DecoArbitration.sol";


contract DecoArbitrationStub is DecoArbitration {

    uint public stubFixedFee;
    uint8 public stubShareFee;

    function setStubFees(uint fixedFee, uint8 shareFee) external {
        stubFixedFee = fixedFee;
        stubShareFee = shareFee;
    }

    function simulateInternalSettleDisputeCall(bytes32 idHash, uint8 respondentShare, uint8 initiatorShare) external {
        this.settleDispute(idHash, respondentShare, initiatorShare);
    }

    function getFixedAndShareFees() external view returns(uint, uint8) {
        return (stubFixedFee, stubShareFee);
    }

}
