pragma solidity 0.4.24;


interface IDecoArbitrationTarget {
    function disputeStartedFreeze(bytes32 idHash) external;

    function disputeSettledTerminate(bytes32 idHash, uint8[] payoutShares) external;

    function checkEligibility(bytes32 idHash, address addressToCheck) external view returns(bool);

    function canStartDispute(bytes32 idHash) external view returns(bool);
}
