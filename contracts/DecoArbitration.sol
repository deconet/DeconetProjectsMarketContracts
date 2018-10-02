pragma solidity 0.4.24;

import "./IDecoArbitration.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DecoArbitration is IDecoArbitration, Ownable {
    using SafeMath for uint256;

    mapping (bytes32 => bool) public disputeStarted;

    mapping (bytes32 => uint8[]) public disputeProposal;

    mapping (bytes32 => address) public disputeInitiatedFrom;

    function startDispute(bytes32 projectIdHash, uint8[] sharesProposal) external {
        emit LogStartDispute(msg.sender, projectIdHash, sharesProposal);
    }

    function acceptProposal(bytes32 projectIdHash) external {
        settleDispute(projectIdHash, disputeProposal[projectIdHash]);
    }

    function rejectProposal(bytes32 projectIdHash) external {
        emit LogRejectProposal(msg.sender, projectIdHash);
    }

    function settleDispute(bytes32 projectIdHash, uint8[] shares) external {
        emit LogEndDispute(msg.sender, projectIdHash, shares);
    }
}
