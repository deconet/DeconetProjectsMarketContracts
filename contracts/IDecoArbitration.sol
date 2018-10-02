pragma solidity 0.4.24;


interface IDecoArbitration {
    function startDispute(bytes32 idHash, uint8[] sharesProposal) external;

    function acceptProposal(bytes32 idHash) external;

    function rejectProposal(bytes32 idHash) external;

    function settleDispute(bytes32 idHash, uint8[] shares) external;

    event LogStartDispute(address sender, bytes32 idHash, uint8[] sharesProposal);

    event LogRejectProposal(address sender, bytes32 idHash);

    event LogEndDispute(address sender, bytes32 idHash, uint8[] shares);
}
