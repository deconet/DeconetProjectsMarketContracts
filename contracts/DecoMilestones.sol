pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "./DecoEscrow.sol";
import "./DecoProjects.sol";
import "./IDecoArbitrationTarget.sol";


contract DecoMilestones is DecoBaseProjectsMarketplace, IDecoArbitrationTarget {

    address public constant ETH_TOKEN_ADDRESS = address(0x0);

    // struct to describe Milestone
    struct Milestone {
        uint8 milestoneNumber;

        // original duration of a milestone.
        uint32 duration;

        // track all adjustments caused by state changes Active <-> Delivered <-> Rejected
        // `adjustedDuration` time gets increased by the time that is spent by client
        // to provide a feedback when agreed milestone time is not exceeded yet.
        // Initial value is the same as duration.
        uint32 adjustedDuration;

        uint depositAmount;
        address tokenAddress;

        uint startedTime;
        uint deliveredTime;
        uint acceptedTime;

        // indicates that a milestone progress was paused.
        bool isOnHold;
    }

    // enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    enum DurationAdjustmentType { Rejected, Unpaused }

    // map agreement id hash to milestones list.
    mapping (bytes32 => Milestone[]) public projectMilestones;

    // `DecoRelay` contract address.
    address public relayContractAddress;

    // Logged when milestone state changes.
    event LogMilestoneStateUpdated (
        bytes32 indexed agreementHash,
        address indexed sender,
        uint timestamp,
        uint8 milestoneNumber,
        MilestoneState indexed state
    );

    event LogMilestoneDurationAdjusted (
        bytes32 indexed agreementHash,
        address indexed sender,
        uint32 amountAdded,
        uint8 milestoneNumber,
        DurationAdjustmentType indexed adjustmentType
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
            require(lastMilestone.acceptedTime > 0, "All milestones must be accepted prior starting a new one.");
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
        require(
            projectsContract.getProjectEndDate(_agreementHash) == 0,
            "Project should be active."
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
                _duration,
                _depositAmount,
                _tokenAddress,
                nowTimestamp,
                0,
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
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectMaker(_agreementHash) == msg.sender, "Sender must be a maker.");
        uint nowTimestamp = now;
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        require(milestonesCount > 0, "There must be milestones to make a delivery.");
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startedTime > 0 && milestone.deliveredTime == 0 && milestone.acceptedTime == 0,
            "Milestone must be active, not delivered and not accepted."
        );
        require(!milestone.isOnHold, "Milestone must not be paused.");
        milestone.deliveredTime = nowTimestamp;
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            milestonesCount,
            MilestoneState.Delivered
        );
    }

    /**
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) external {
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectClient(_agreementHash) == msg.sender, "Sender must be a client.");
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        require(milestonesCount > 0, "There must be milestones to accept a delivery.");
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startedTime > 0 &&
            milestone.acceptedTime == 0 &&
            milestone.deliveredTime > 0 &&
            milestone.isOnHold == false,
            "Milestone should be active and delivered, but not rejected, or already accepted, or put on hold."
        );
        uint nowTimestamp = now;
        milestone.acceptedTime = nowTimestamp;
        if (projectsContract.getProjectMilestonesCount(_agreementHash) == milestonesCount) {
            projectsContract.completeProject(_agreementHash);
        }
        distributeFundsInEscrow(
            projectsContract.getProjectEscrowAddress(_agreementHash),
            projectsContract.getProjectMaker(_agreementHash),
            milestone.depositAmount,
            milestone.tokenAddress
        );
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            milestonesCount,
            MilestoneState.Accepted
        );
    }

    /**
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastDeliverable(bytes32 _agreementHash) external {
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectClient(_agreementHash) == msg.sender, "Sender must be a client.");
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        require(milestonesCount > 0, "There must be milestones to reject a delivery.");
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startedTime > 0 &&
            milestone.acceptedTime == 0 &&
            milestone.deliveredTime > 0 &&
            milestone.isOnHold == false,
            "Milestone should be active and delivered, but not rejected, or already accepted, or put on hold."
        );
        uint nowTimestamp = now;
        if (milestone.startedTime.add(milestone.adjustedDuration) > milestone.deliveredTime) {
            uint32 timeToAdd = uint32(nowTimestamp.sub(milestone.deliveredTime));
            milestone.adjustedDuration += timeToAdd;
            emit LogMilestoneDurationAdjusted (
                _agreementHash,
                msg.sender,
                timeToAdd,
                milestonesCount,
                DurationAdjustmentType.Rejected
            );
        }
        milestone.deliveredTime = 0;
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            milestonesCount,
            MilestoneState.Rejected
        );
    }

    /**
     * @dev Set the new address of the `DecoRelay` contract.
     * @param _newAddress An address of the new contract.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        relayContractAddress = _newAddress;
    }

    function disputeStartedFreeze(bytes32 _idHash) external {
    }

    function disputeSettledTerminate(
        bytes32 _idHash,
        address _respondent,
        uint8 _respondentShare,
        address _initiator,
        uint8 _initiatorShare,
        bool _isInternal,
        address _arbiterWithdrawalAddress
    )
        external
    {
    }

    function checkEligibility(bytes32 _idHash, address _addressToCheck) external view returns(bool) {
    }

    function canStartDispute(bytes32 _idHash) external view returns(bool) {
    }

    /**
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     *      All blocked funds should be distributed in favor of eligible project party.
     *      The termination with this method initiated only by project contract.
     * @param _agreementHash Project`s unique hash.
     * @param _initiator An `address` of the termination initiator.
     */
    function terminateLastMilestone(bytes32 _agreementHash, address _initiator) public {
        address projectsContractAddress = DecoRelay(relayContractAddress).projectsContractAddress();
        require(msg.sender == projectsContractAddress, "Method should be called by Project contract.");
        DecoProjects projectsContract = DecoProjects(projectsContractAddress);
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        address projectClient = projectsContract.getProjectClient(_agreementHash);
        address projectMaker = projectsContract.getProjectMaker(_agreementHash);
        require(
            _initiator == projectClient ||
            _initiator == projectMaker,
            "Initiator should be either maker or client address."
        );
        if (_initiator == projectClient) {
            require(canClientTerminate(_agreementHash));
        } else if (_initiator == projectMaker) {
            require(canMakerTerminate(_agreementHash));
        }
        uint milestonesCount = projectMilestones[_agreementHash].length;
        if (milestonesCount > 0) {
            Milestone memory lastMilestone = projectMilestones[_agreementHash][milestonesCount - 1];
            address projectEscrowContractAddress = projectsContract.getProjectEscrowAddress(_agreementHash);
            if (_initiator == projectClient) {
                unblockFundsInEscrow(
                    projectEscrowContractAddress,
                    lastMilestone.depositAmount,
                    lastMilestone.tokenAddress
                );
            } else if (_initiator == projectMaker) {
                distributeFundsInEscrow(
                    projectEscrowContractAddress,
                    _initiator,
                    lastMilestone.depositAmount,
                    lastMilestone.tokenAddress
                );
            }
        }
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            now,
            uint8(milestonesCount),
            MilestoneState.Terminated
        );
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
     * @dev Client can terminate milestone if the last milestone delivery is overdue and
     *      milestone is not on hold. By default termination is not available.
     * @param _agreementHash Project`s unique hash.
     * @return `true` if the last project's milestone could be terminated by client.
     */
    function canClientTerminate(bytes32 _agreementHash) public view returns(bool) {
        uint milestonesCount = projectMilestones[_agreementHash].length;
        if (milestonesCount == 0) return false;
        Milestone memory lastMilestone = projectMilestones[_agreementHash][milestonesCount - 1];
        return lastMilestone.acceptedTime == 0 &&
            !lastMilestone.isOnHold &&
            lastMilestone.startedTime.add(uint(lastMilestone.duration)) < now;
    }

    /**
     * @dev Maker can terminate milestone if delivery review is taking longer than project feedback window and
     *      milestone is not on hold, or if client doesn't start the next milestone for a period longer than
     *      project's milestone start window. By default termination is not available.
     * @param _agreementHash Project`s unique hash.
     * @return `true` if the last project's milestone could be terminated by maker.
     */
    function canMakerTerminate(bytes32 _agreementHash) public view returns(bool) {
        address projectsContractAddress = DecoRelay(relayContractAddress).projectsContractAddress();
        DecoProjects projectsContract = DecoProjects(projectsContractAddress);
        uint feedbackWindow = uint(projectsContract.getProjectFeedbackWindow(_agreementHash)).mul(24 hours);
        uint milestoneStartWindow = uint(projectsContract.getProjectMilestoneStartWindow(
            _agreementHash
        )).mul(24 hours);
        uint projectStartDate = projectsContract.getProjectStartDate(_agreementHash);
        uint milestonesCount = projectMilestones[_agreementHash].length;
        if (milestonesCount == 0 && now.sub(projectStartDate) > milestoneStartWindow) return true;
        Milestone memory lastMilestone = projectMilestones[_agreementHash][milestonesCount - 1];
        uint nowTimestamp = now;
        if (!lastMilestone.isOnHold &&
            lastMilestone.acceptedTime > 0 &&
            nowTimestamp.sub(lastMilestone.acceptedTime) > milestoneStartWindow)
            return true;
        return !lastMilestone.isOnHold &&
            lastMilestone.acceptedTime == 0 &&
            lastMilestone.deliveredTime > 0 &&
            nowTimestamp.sub(feedbackWindow) > lastMilestone.deliveredTime;
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
            address tokenAddress,
            uint startedTime,
            uint deliveredTime,
            uint acceptedTime,
            bool isOnHold
        )
    {
        Milestone[] memory milestones = projectMilestones[_agreementHash];
        if (_position >= milestones.length) {
            return (0, 0, 0, 0, address(0x0), 0, 0, 0, false);
        }
        Milestone memory milestone = milestones[_position];
        return (
            milestone.milestoneNumber,
            milestone.duration,
            milestone.adjustedDuration,
            milestone.depositAmount,
            milestone.tokenAddress,
            milestone.startedTime,
            milestone.deliveredTime,
            milestone.acceptedTime,
            milestone.isOnHold
        );
    }

    function checkProjectIsActive(bytes32 _agreementHash) internal returns(bool) {

    }

    function blockFundsInEscrow(
        address _projectEscrowContractAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(_projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.blockFunds(_amount);
        } else {
            escrow.blockTokenFunds(_tokenAddress, _amount);
        }
    }

    function unblockFundsInEscrow(
        address _projectEscrowContractAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(_projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.unblockFunds(_amount);
        } else {
            escrow.unblockTokenFunds(_tokenAddress, _amount);
        }
    }

    function distributeFundsInEscrow(
        address _projectEscrowContractAddress,
        address _distributionTargetAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(_projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.distributeFunds(_distributionTargetAddress, _amount);
        } else {
            escrow.distributeTokenFunds(_distributionTargetAddress, _tokenAddress, _amount);
        }
    }
}
