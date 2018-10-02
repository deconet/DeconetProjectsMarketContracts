pragma solidity 0.4.24;


interface IDecoArbitrationTarget {
    function disputeStartedFreeze(bytes32 projectIdHash) external;

    function disputeSettledTerminate(bytes32 projectIdHash, uint8[] payoutShares) external;

    function canStartDispute(bytes32 projectIdHash) external view returns(bool);
}
