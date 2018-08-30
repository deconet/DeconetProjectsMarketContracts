pragma solidity 0.4.24;

import "./DecoMilestones.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract DecoEscrow is Ownable {
    using SafeMath for uint256;

    // Indicates if the current clone has been initialized.
    bool internal isInitialized;

    // Mapping addresses to authorization status for executing funds distribution operations.
    mapping(address => bool) public fundsDistributionAuthorization;

    // State variable to track available ETH Escrow owner balance.
    // Anything that is not blocked or distributed in favor of any party can be withdrawn by the owner.
    uint public escrowBalance;

    // Mapping of available for withdrawal funds by the address.
    // Accounted amounts are excluded from the `escrowBalance`.
    mapping (address => uint) public withdrawAllowancesForAddress;

    // Stores the list of all ERC20 tokens have ever been deposited in this Escrow instance.
    address[] public depositedTokensAddresses;

    // Maps information about the amount of deposited ERC20 token to the token address.
    mapping(address => uint) public escrowTokensBalance;

    /**
     * Mapping of ERC20 tokens amounts to token addresses that are available for withdrawal for a given address.
     * Accounted here amounts are excluded from the `escrowTokensBalance`.
     */
    mapping(address => mapping(address => uint)) public tokensWithdrawAllowanceForAddress;

    // Logged when new incoming payment appears.
    event IncomingPayment (
        address from,
        uint depositAmount,
        PaymentType paymentType,
        address tokenAddress
    );

    // Logged when either ETH or ERC20 tokens were sent out of this contract balance.
    event OutgoingPayment (
        address from,
        uint depositAmount,
        PaymentType paymentType,
        address tokenAddress
    );

    // Logged when the given address authorization to distribute Escrow funds changed.
    event FundsDistributionAuthorization (
        address targetAddress,
        bool isAuthorized
    );

    // Accepted types of payments.
    enum PaymentType { Ether, Erc20 }

    // Restrict function call to be originated from an address that was authorized to distribute funds.
    modifier onlyAuthorized() {
        require(fundsDistributionAuthorization[msg.sender]);
        _;
    }

    /**
     * @dev Default `payable` fallback to accept incoming ETH from any address.
     */
    function () public payable {
        deposit();
    }

    /**
     * @dev Initialize the Escrow clone with default values.
     * @param _newOwner An address of a new escrow owner.
     * @param _authorizedAddresses An array of addresses that will be added to authorized for funds
     *  distribution addresses list.
     */
    function initialize(address _newOwner, address[] _authorizedAddresses) external onlyOwner {
        require(!isInitialized);
        isInitialized = true;
        for (uint i = 0; i < _authorizedAddresses.length; i++) {
            fundsDistributionAuthorization[_authorizedAddresses[i]] = true;
        }
        _transferOwnership(_newOwner);
    }

    /**
     * @dev Start transfering the given amount of the ERC20 tokens available by provided address.
     * @param _tokenAddress ERC20 token contract address.
     * @param _amount Amount to transfer from sender`s address.
     */
    function depositErc20(address _tokenAddress, uint _amount) external {
        require(_tokenAddress != address(0x0));
        StandardToken token = StandardToken(_tokenAddress);
        token.transferFrom(msg.sender, address(this), _amount);
        escrowTokensBalance[_tokenAddress] = escrowTokensBalance[_tokenAddress].add(_amount);
        emit IncomingPayment(msg.sender, _amount, PaymentType.Erc20, _tokenAddress);
    }

    /**
     * @dev Withdraw the given amount of ETH to sender`s address if allowance or contract balance is sufficient.
     * @param _amount Amount to withdraw.
     */
    function withdraw(uint _amount) external {
    }

    /**
     * @dev Withdraw the given amount of ERC20 token to sender`s address if allowance or contract balance is sufficient.
     * @param _tokenAddress ERC20 token address.
     * @param _amount Amount to withdraw.
     */
    function withdrawErc20(address _tokenAddress, uint _amount) external {
    }

    /**
     * @dev Distribute funds between contract`s balance, blocked reserve, and allowances for some external addresses.
     *  Deposit may be returned back to the contract address, i.e. to the escrow owner.
     *  Or deposit may flow to the allowance for addresses as a result of an evidence
     *  given by an authorized party about fullfilled obligations.
     *  Or funds may be partially distributed between the owner and the target addresses.
     * @param _destinations Destination addresses for funds distribution.
     * @param _amounts Amounts to distribute ordered accordingly with destinations.
     */
    function distributeFunds(
        address[] _destinations,
        uint[] _amounts
    )
        external
        onlyAuthorized
    {
    }

    /**
     * @dev Distribute ERC20 token funds between contract`s balance, blocked reserve,
     *      and allowances for some external addresses.
     *      Deposit may be returned back to the contract address, i.e. to the escrow owner.
     *      Or deposit may flow to the allowance for addresses as a result of an evidence
     *      given by authorized party about fullfilled obligations.
     *      Or funds may be partially distributed between the owner and the target addresses.
     * @param _destinations Destination addresses for funds distribution.
     * @param _token ERC20 Token address.
     * @param _amounts Amounts to distribute ordered accordingly with destinations.
     */
    function distributeTokenFunds(
        address[] _destinations,
        address _token,
        uint[] _amounts
    )
        external
        onlyAuthorized
    {
    }

    /**
     * @dev Accept and account incoming deposit in contract state.
     */
    function deposit() public payable {
        require(msg.value > 0);
        escrowBalance = escrowBalance.add(msg.value);
        emit IncomingPayment(msg.sender, msg.value, PaymentType.Ether, address(0x0));
    }
}
