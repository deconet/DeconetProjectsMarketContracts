pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";


contract DecoProject is DecoBaseProjectsMarketplace {

    // structure to store project details
    struct Project {
        address client;
        address maker;
        uint startDate;
        uint endDate;
        uint8 paymentWindow;
        uint8 feedbackWindow;
        uint8 milestonesCount;
        uint8 customerSatisfaction;
        uint8 makerSatisfaction;

        bool agreementsEncrypted;
    }

    // enumeration to describe possible project states for easier state changes reporting
    enum ProjectState { Active, Completed, Terminated }

    // Logged when project state changes.
    event ProjectStateUpdate (
        bytes32 agreementHash,
        address updatedBy,
        uint timestamp,
        ProjectState state
    );

    // Logged when either party rate the other party after the project completion.
    event ProjectRated (
        bytes32 agreementHash,
        address ratedBy,
        uint8 rating
    );

    event SupplementalAgreementAdded(
        bytes32 agreementHash,
        bytes32 supplementalAgreementHash
    );

    // maps agreement unique hash to the project details
    mapping (bytes32 => Project) public projects;

    // maps the main agreement to the array of all made by the team documented changes.
    mapping (bytes32 => bytes32[]) internal projectChangesAgreements;

    // Modifier to restrict method to be called either by project owner or maker
    modifier eitherClientOrMaker(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.client == msg.sender || project.maker == msg.sender,
            "Only project owner or maker can perform this operation."
        );
    }

    // Modifier to restrict method to be called by project owner
    modifier onlyOwner(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.client == msg.sender,
            "Only project owner can perform this operation."
        );
    }

    // Modifier to restrict method to be called by project maker
    modifier onlyMaker(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.maker == msg.sender,
            "Only project maker can perform this operation."
        );
    }

    /*
     * @dev Creates a new project. All parameters are required.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _client Address of a project owner.
     * @param _maker Address of a maker signed up for a project.
     * @param _makersSignature Digital signature of a maker to proof the makers signed the agreement.
     * @param _milestonesCount Count of planned milestones for the project.
     * @param _paymentWindow Count of days project`s owner has to deposit funds for the next milestone.
     *        If this time exceeded then maker can terminate project.
     * @param _feedbackWindow Time in days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate project and get paid for awaited
     *                        milestone.
     */
    function startProject(
        bytes32 _agreementHash,
        address _client,
        address _maker,
        bytes32 _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow
    )
        public;

    
    /*
     * @dev Terminate the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function terminateProject(bytes32 _agreementHash) public;

    /*
     * @dev Complete the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function completeProject(bytes32 _agreementHash) public;

    /*
     * @dev Rate the second party on the project.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _rating Either client's or maker's satisfaction value. 
              Min value is 0, max is 5.
     */
    function rateProjectSecondParty(uint8 _agreementHash, uint8 _rating) public;

    /*
     * @dev Save supplement agreement to the existing one. All parameters are required.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _supplementAgreement Unique id of a supplement agreement.
     * @param _makersSignature Digital signature of a maker to proof the makers signed the agreement.
     * @param _milestonesCount Count of planned milestones for the project.
     * @param _paymentWindow Count of days project`s owner has to deposit funds for the next milestone.
     *        If this time exceeded then maker can terminate project.
     * @param _feedbackWindow Time in days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate project and get paid for awaited
     *                        milestone.
     */
    function saveSupplementalAgreement(
        bytes32 _agreementHash, 
        bytes32 _supplementalAgreementHash,
        bytes32 _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow
    ) 
        public;

}
