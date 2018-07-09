pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";


contract DecoMilestones {

    struct Milestone {
        uint8 milestoneNumber;
        uint32 duration;
        uint32 depositAmount;
        uint startTime;
        uint deliveryTime;
    }

    // Enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    // Map project/agreement hash to milestones list.
    mapping (bytes32 => Milestone[]) internal projectMilestones;

    // Projects contract address to load some project data.
    address public projectContractAddress;

    // Logged when milestone state changes.
    event MilestoneStateUpdate (
        bytes32 agreementHash,
        address updatedBy,
        uint8 milestoneNumber,
        uint timestamp,
        MilestoneState state
    )

    /*
     * @dev Starts a new milestone for the project and deposit ETH in smart contract`s escrow.
     * @param _agreementHash Project`s unique hash.
     * @param _depositAmount Amount of ETH to deposit for a new milestone.
     */
    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount
    )
        public
        payable;

    /*
     * @dev Maker delivers the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function deliverLastMilestone(bytes32 _agreementHash) public;

    /*
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) public;

    /*
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastMilestone(bytes32 _agreementHash) public;
 
    /*
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     * @param _agreementHash Project`s unique hash.
     */
    function terminateLastMilestone(bytes32 _agreementHash) public;

    /*
     * @dev Returns true/false depending on if the project can be terminated by client.
     * @param _agreementHash Project`s unique hash.
     */
    function canClientTerminate(bytes32 _agreementHash) public returns(bool);

    /*
     * @dev Returns true/false depending on if the project can be terminated by maker.
     * @param _agreementHash Project`s unique hash.
     */
    function canMakerTerminate(bytes32 _agreementHash) public returns(bool);


}
