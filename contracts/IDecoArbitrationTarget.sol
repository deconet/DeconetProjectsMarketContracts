pragma solidity 0.4.24;


interface IDecoArbitrationTarget {
    function disputeStartFreeze(bytes32 projectIdHash) external;

    function disputeSettled(bytes32 projectIdHash, uint[] payoutShares) external;
}
