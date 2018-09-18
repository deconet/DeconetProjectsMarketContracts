pragma solidity 0.4.24;


interface IDecoArbitration {
    function startDispute(bytes32 projectIdHash, uint[] sharesProposal) external;

    function acceptProposal(bytes32 projectIdHash) external;

    function rejectProposal(bytes32 projectIdHash) external;

    function settleDispute(bytes32 projectIdHash, uint[] shares) external;

    event DisputeStart(address sender, bytes32 projectIdHash, uint fundsShareProposal);

    event DisputeEnd(address sender, bytes32 projectIdHash, uint makersShare, )
}
