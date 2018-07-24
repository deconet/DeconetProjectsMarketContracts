pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ECRecovery.sol";


contract DecoProjects is DecoBaseProjectsMarketplace {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    // structure to store project details
    struct Project {
        string agreementId;
        address client;
        address maker;
        address arbiter;
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

    // Logged when a new supplemental agreement is added.
    event NewSupplementalAgreement(
        bytes32 agreementHash,
        bytes supplementalAgreementHash
    );

    // maps agreement unique hash to the project details
    mapping (bytes32 => Project) public projects;

    // maps the main agreement to the array of all made by the team documented changes.
    mapping (bytes32 => string[]) public projectChangesAgreements;

    // maps all maker's projects hashes to maker's address
    mapping (address => bytes32[]) public makerProjects;

    // maps all client's projects hashes to client's address 
    mapping (address => bytes32[]) public clientProjects;

    address public milestonesContractAddress;

    // Modifier to restrict method to be called either by project owner or maker
    modifier eitherClientOrMaker(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.client == msg.sender || project.maker == msg.sender,
            "Only project owner or maker can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project owner
    modifier onlyClient(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.client == msg.sender,
            "Only project owner can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project maker
    modifier onlyMaker(bytes32 agreementHash) {
        Project memory project = projects[agreementHash];
        require(
            project.maker == msg.sender,
            "Only project maker can perform this operation."
        );
        _;
    }

    /**
     * @dev Creates a new milestones based project with pre-selected maker. All parameters are required.
     * @param _agreementId Unique id of a project`s agreement.
     * @param _client Address of a project owner.
     * @param _arbiter A referee to settle all escalated disputes between parties.
     * @param _maker Address of a maker signed up for a project.
     * @param _makersSignature Digital signature of a maker to proof the makers signed the agreement.
     * @param _milestonesCount Count of planned milestones for the project.
     * @param _paymentWindow Count of days project`s owner has to deposit funds for the next milestone.
     *        If this time exceeded then maker can terminate project.
     * @param _feedbackWindow Time in days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate project and get paid for awaited
     *                        milestone.
     * @param _agreementEncrypted A boolean flag indicating whether or not the agreement is encrypted.
     */
    function startProject(
        string _agreementId,
        address _client,
        address _arbiter,
        address _maker,
        bytes _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow,
        bool _agreementEncrypted
    )
        public
    {
        require(msg.sender == _client, "Only the client can kick of the project.");
        require(_client != _maker, 'Client can`t be a maker on her own project.');
        require(
            _arbiter != _maker && _arbiter != _client,
            'Arbiter must not be a client nor a maker.'
        );

        bytes32 hash = keccak256(_agreementId);
        address signatureAddress = hash.toEthSignedMessageHash().recover(_makersSignature);
        require(
            signatureAddress == _maker,
            "Maker should sign the hash of immutable agreement doc."
        );

        require(_milestonesCount >= 1 && _milestonesCount <= 24);

        Project storage project = projects[hash];
        require(project.client == address(0x0));

        makerProjects[_maker].push(hash);
        clientProjects[_client].push(hash);

        uint nowTimestamp = now;
        projects[hash] = Project(
            _agreementId,
            msg.sender,
            _maker,
            _arbiter,
            nowTimestamp,
            0, // end date is unknown yet
            _paymentWindow,
            _feedbackWindow,
            _milestonesCount,
            0, // CSAT is 0 to indicate that it isn't set by maker yet
            0, // MSAT is 0 to indicate that it isn't set by client yet
            _agreementEncrypted
        );
        emit ProjectStateUpdate(hash, msg.sender, nowTimestamp, ProjectState.Active);
    }

    /**
     * @dev Terminate the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function terminateProject(bytes32 _agreementHash) public eitherClientOrMaker(_agreementHash) {

    }

    /**
     * @dev Complete the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function completeProject(bytes32 _agreementHash) public {

    }

    /**
     * @dev Rate the second party on the project.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _rating Either client's or maker's satisfaction value. 
              Min value is 0, max is 10.
     */
    function rateProjectSecondParty(bytes32 _agreementHash, uint8 _rating) public {

    }

    /**
     * @dev Save supplement agreement to the existing one. All parameters are required.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _supplementalAgreementHash Unique id of a supplement agreement.
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
        string _supplementalAgreementHash,
        bytes32 _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow
    ) 
        public
    {

    }

    /**
     * @dev Updates the address of the Milestones contract.
     * @param _newAddress An address of the new instance of Milestones contract.
     */
    function setMilestonesContractAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0x0));
        require(_newAddress != milestonesContractAddress);
        milestonesContractAddress = _newAddress;
    }

    /**
     * @dev Returns average CSAT of the given maker`s address
     * @param _maker Maker`s address to look up.
     * @return An uint8 calculated score.
     */
    function makersAverageRating(address _maker) public view returns(uint8) {
        return calculateAverageScore(_maker, true);
    }

    /**
     * @dev Returns average MSAT of the given client`s address.
     * @param _client Client`s address to look up.
     * @return An uint8 calculated score.
     */
    function clientsAverageRating(address _client) public view returns(uint8) {
        return calculateAverageScore(_client, false);
    }

    /**
     * @dev Returns hashes of all client`s projects
     * @param _client An address to look up.
     * @return An array of bytes32 hashes.
     */
    function getClientProjects(address _client) public view returns(bytes32[]) {
        return clientProjects[_client];
    }

    /**
     * @dev Returns hashes of all maker`s projects
     * @param _maker An address to look up.
     * @return An array of bytes32 hashes.
     */
    function getMakerProjects(address _maker) public view returns(bytes32[]) {
        return makerProjects[_maker];
    }

    /**
     * @dev Calculates average score of a given address as a maker or a client.
     * @param _address Address of a target person.
     * @param _calculateCustomerSatisfactionScore Indicates what score should be calculated.
              If `true` then CSAT score of this address should be returned,
              otherwise – calculate and return MSAT score.
     * @return An uint8 calculated score.
     */
    function calculateAverageScore(
        address _address,
        bool _calculateCustomerSatisfactionScore
    )
        internal
        view
        returns(uint8) 
    {
        bytes32[] storage allProjectsHashes = _calculateCustomerSatisfactionScore ?
            makerProjects[_address] :
            clientProjects[_address];
        uint rating = 0;
        uint index;
        for (index = 0; index < allProjectsHashes.length; index++) {
            Project storage project = projects[allProjectsHashes[index]];
            uint8 score = _calculateCustomerSatisfactionScore ?
                project.customerSatisfaction :
                project.makerSatisfaction;
            rating.add(score);
        }
        rating = rating.div(index);
        index.add(1);
        return uint8(rating);
    }
}
