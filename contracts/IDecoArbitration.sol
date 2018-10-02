pragma solidity 0.4.24;


interface IDecoArbitration {
    function startDispute(bytes32 projectIdHash, uint8[] sharesProposal) external;

    function acceptProposal(bytes32 projectIdHash) external;

    function rejectProposal(bytes32 projectIdHash) external;

    function settleDispute(bytes32 projectIdHash, uint8[] shares) external;

    event LogStartDispute(address sender, bytes32 projectIdHash, uint8[] sharesProposal);

    event LogRejectProposal(address sender, bytes32 projectIdHash);

    event LogEndDispute(address sender, bytes32 projectIdHash, uint8[] shares);
}
