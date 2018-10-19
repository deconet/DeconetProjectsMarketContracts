pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "./DecoEscrow.sol";
import "./DecoProjects.sol";


contract DecoMilestones is DecoBaseProjectsMarketplace {

    address public constant ETH_TOKEN_ADDRESS = address(0x0);

    // struct to describe Milestone
    struct Milestone {
        uint8 milestoneNumber;
        uint32 duration;

        // track all adjustments caused by state changes Active <-> Delivered <-> Rejected
        // `adjustedDuration` time gets increased by the time that is spent by client
        // to provide a feedback when agreed milestone time is not exceeded yet.
        // Initial value is the same as duration.
        uint32 adjustedDuration; 

        uint depositAmount;
        address tokenAddress;

        uint startTime;
        uint deliveryTime;
        bool isAccepted;
    }

    // enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    // map agreement id hash to milestones list.
    mapping (bytes32 => Milestone[]) public projectMilestones;

    // `DecoRelay` contract address.
    address public relayContractAddress;

    // Logged when milestone state changes.
    event LogMilestoneStateUpdated (
        bytes32 indexed agreementHash,
        address indexed updatedBy,
        uint timestamp,
        uint8 milestoneNumber,
        MilestoneState state
    );

    /**
     * @dev Starts a new milestone for the project and deposit ETH in smart contract`s escrow.
     * @param _agreementHash A `bytes32` hash of the agreement id.
     * @param _depositAmount An `uint` of wei that are going to be deposited for a new milestone.
     * @param _duration An `uint` seconds of a milestone duration.
     */
    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount,
        address _tokenAddress,
        uint32 _duration
    )
        external
    {
        uint8 completedMilestonesCount = uint8(projectMilestones[_agreementHash].length);
        if (completedMilestonesCount > 0) {
            Milestone memory lastMilestone = projectMilestones[_agreementHash][completedMilestonesCount - 1];
            require(lastMilestone.isAccepted, "All milestones must be accepted prior starting a new one.");
        }
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(
            projectsContract.getProjectClient(_agreementHash) == msg.sender,
            "Only project's client starts a miestone"
        );
        require(
            projectsContract.getProjectMilestonesCount(_agreementHash) > completedMilestonesCount,
            "Milestones count should not exceed the number configured in the project."
        );
        blockFundsInEscrow(
            projectsContract.getProjectEscrowAddress(_agreementHash),
            _depositAmount,
            _tokenAddress
        );
        uint nowTimestamp = now;
        projectMilestones[_agreementHash].push(
            Milestone(
                completedMilestonesCount + 1,
                _duration,
                0,
                _depositAmount,
                _tokenAddress,
                nowTimestamp,
                0,
                false
            )
        );
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            completedMilestonesCount + 1,
            MilestoneState.Active
        );
    }

    /**
     * @dev Maker delivers the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function deliverLastMilestone(bytes32 _agreementHash) external {
    }

    /**
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) external {
    }

    /**
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastDeliverable(bytes32 _agreementHash) external {
    }

    /**
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     * @param _agreementHash Project`s unique hash.
     */
    function terminateLastMilestone(bytes32 _agreementHash) external {
    }

    /**
     * @dev Set the new address of the `DecoRelay` contract.
     * @param _newAddress An address of the new contract.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        relayContractAddress = _newAddress;
    }

    /**
     * @dev Returns the last project milestone completion status and number.
     * @param _agreementHash Project's unique hash.
     * @return isAccepted A boolean flag for acceptance state, and milestoneNumber for the last milestone.
     */
    function isLastMilestoneAccepted(
        bytes32 _agreementHash
    )
        public
        returns(bool isAccepted, uint8 milestoneNumber)
    {
    }

    /**
     * @dev Returns true/false depending on if the project can be terminated by client.
     * @param _agreementHash Project`s unique hash.
     */
    function canClientTerminate(bytes32 _agreementHash) public returns(bool) {
    }

    /**
     * @dev Returns true/false depending on if the project can be terminated by maker.
     * @param _agreementHash Project`s unique hash.
     */
    function canMakerTerminate(bytes32 _agreementHash) public returns(bool) {
    }

    /**
     * @dev Get the milestone for the given project and at the given position.
     * @param _agreementHash A `bytes32` hash of the agreement id.
     * @param _position An `uint` offset in milestones array for the project.
     * @return A `Milestone` object.
     */
    function getMilestone(
        bytes32 _agreementHash,
        uint _position
    )
        public
        view
        returns(
            uint8 milestoneNumber,
            uint32 duration,
            uint32 adjustedDuration,
            uint depositAmount,
            uint startTime,
            uint deliveryTime,
            bool isAccepted
        )
    {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        if (_position >= milestones.length) {
            return (0, 0, 0, 0, 0, 0, false);
        }
        return (
            milestones[_position].milestoneNumber,
            milestones[_position].duration,
            milestones[_position].adjustedDuration,
            milestones[_position].depositAmount,
            milestones[_position].startTime,
            milestones[_position].deliveryTime,
            milestones[_position].isAccepted
        );
    }

    function blockFundsInEscrow(
        address projectEscrowContractAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.blockFunds(_amount);
        } else {
            escrow.blockTokenFunds(_tokenAddress, _amount);
        }
    }
}
