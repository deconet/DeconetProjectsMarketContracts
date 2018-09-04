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
    uint public balance;

    // Mapping of available for withdrawal funds by the address.
    // Accounted amounts are excluded from the `balance`.
    mapping (address => uint) public withdrawalAllowanceForAddress;

    // Maps information about the amount of deposited ERC20 token to the token address.
    mapping(address => uint) public tokensBalance;

    /**
     * Mapping of ERC20 tokens amounts to token addresses that are available for withdrawal for a given address.
     * Accounted here amounts are excluded from the `tokensBalance`.
     */
    mapping(address => mapping(address => uint)) public tokensWithdrawalAllowanceForAddress;

    // ETH amount blocked in Escrow.
    uint public blockedBalance;

    // Mapping of the amount of ERC20 tokens to the the token address that are blocked in Escrow.
    mapping(address => uint) public blockedTokensBalance;

    // Logged when new incoming payment appears.
    event IncomingPayment (
        address from,
        uint depositAmount,
        PaymentType paymentType,
        address tokenAddress
    );

    // Logged when either ETH or ERC20 tokens were sent out of this contract balance.
    event OutgoingPayment (
        address to,
        uint amount,
        PaymentType paymentType,
        address tokenAddress
    );

    // Logged when the given address authorization to distribute Escrow funds changed.
    event FundsDistributionAuthorization (
        address targetAddress,
        bool isAuthorized
    );

    event FundsBlockedOrUnblocked (
        address from,
        address tokenAddress,
        uint amount,
        PaymentType paymentType,
        bool fundsUnblocked
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
            address newAuthorizedAddress = _authorizedAddresses[i];
            fundsDistributionAuthorization[newAuthorizedAddress] = true;
            emit FundsDistributionAuthorization(newAuthorizedAddress, true);
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
        require(token.transferFrom(msg.sender, address(this), _amount));
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].add(_amount);
        emit IncomingPayment(msg.sender, _amount, PaymentType.Erc20, _tokenAddress);
    }

    /**
     * @dev Withdraw the given amount of ETH to sender`s address if allowance or contract balance is sufficient.
     * @param _amount Amount to withdraw.
     */
    function withdraw(uint _amount) external {
        require(_amount <= address(this).balance);
        if (msg.sender == owner) {
            balance = balance.sub(_amount);
        } else {
            uint withdrawalAllowance = withdrawalAllowanceForAddress[msg.sender];
            withdrawalAllowanceForAddress[msg.sender] = withdrawalAllowance.sub(_amount);
        }
        require(msg.sender.call.value(_amount)());
        emit OutgoingPayment(msg.sender, _amount, PaymentType.Ether, address(0x0));
    }

    /**
     * @dev Withdraw the given amount of ERC20 token to sender`s address if allowance or contract balance is sufficient.
     * @param _tokenAddress ERC20 token address.
     * @param _amount Amount to withdraw.
     */
    function withdrawErc20(address _tokenAddress, uint _amount) external {
        StandardToken token = StandardToken(_tokenAddress);
        require(_amount <= token.balanceOf(this));
        if (msg.sender == owner) {
            tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].sub(_amount);
        } else {
            uint tokenWithdrawalAllowance = getTokenWithdrawalAllowance(msg.sender, _tokenAddress);
            tokensWithdrawalAllowanceForAddress[msg.sender][_tokenAddress] =
                tokenWithdrawalAllowance.sub(_amount);
        }
        token.transfer(msg.sender, _amount);
        emit OutgoingPayment(msg.sender, _amount, PaymentType.Erc20, _tokenAddress);
    }

    /**
     * @dev Block funds for future use by authorized parties listed in `fundsDistributionAuthorization` mapping.
     * @param _amount An uint of Wei to be blocked.
     */
    function blockFunds(uint _amount) external onlyAuthorized {
        require(_amount <= balance);
        balance = balance.sub(_amount);
        blockedBalance = blockedBalance.add(_amount);
        emit FundsBlockedOrUnblocked(
            msg.sender,
            address(0x0),
            _amount,
            PaymentType.Ether,
            false
        );
    }

    /**
     * @dev Unblock blocked funds and make them available to the contract owner.
     * @param _amount An uint of Wei to be unblocked.
     */
    function unblockFunds(uint _amount) external onlyAuthorized {
        require(_amount <= blockedBalance);
        blockedBalance = blockedBalance.sub(_amount);
        balance = balance.add(_amount);
        emit FundsBlockedOrUnblocked(
            msg.sender,
            address(0x0),
            _amount,
            PaymentType.Ether,
            true
        );
    }

    /**
     * @dev Blocks ERC20 tokens funds for future use by authorized parties listed in
     *      `fundsDistributionAuthorization` mapping.
     * @param _tokenAddress An address of ERC20 token.
     * @param _amount An uint of tokens to be blocked.
     */
    function blockTokenFunds(address _tokenAddress, uint _amount) external onlyAuthorized {
        uint accountedTokensBalance = tokensBalance[_tokenAddress];
        require(_amount <= accountedTokensBalance);
        tokensBalance[_tokenAddress] = accountedTokensBalance.sub(_amount);
        blockedTokensBalance[_tokenAddress] = blockedTokensBalance[_tokenAddress].add(_amount);
        emit FundsBlockedOrUnblocked(
            msg.sender,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            false
        );
    }

    /**
     * @dev Unblock blocked token funds and make them available to the contract owner.
     * @param _amount An uint of Wei to be unblocked.
     */
    function unblockTokenFunds(address _tokenAddress, uint _amount) external onlyAuthorized {
        uint accountedBlockedTokensAmount = blockedTokensBalance[_tokenAddress];
        require(_amount <= accountedBlockedTokensAmount);
        blockedTokensBalance[_tokenAddress] = accountedBlockedTokensAmount.sub(_amount);
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].add(_amount);
        emit FundsBlockedOrUnblocked(
            msg.sender,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            true
        );
    }

    /**
     * @dev Distribute funds between contract`s balance and allowances for some addresses.
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
     * @dev Distribute ERC20 token funds between contract`s balance and allowances for some addresses.
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
     * @dev Check if there is enough available ETH on the contract address.
     * @param _requiredAmount Wei amount required.
     * @return A boolean value indicating if there is enough deposited funds on the contract address.
     */
    function checkIfEnoughFunds(uint _requiredAmount) external view returns(bool) {
        return balance >= _requiredAmount;
    }

    /**
     * @dev Check if there is enough available token on the contract address.
     * @param _tokenAddress An address of targeted ERC20 token.
     * @param _requiredAmount Wei amount required.
     * @return A boolean value indicating if there is enough deposited funds on the contract address.
     */
    function checkIfEnoughTokenFunds(
        address _tokenAddress,
        uint _requiredAmount
    )
        external
        view
        returns(bool)
    {
        return tokensBalance[_tokenAddress] >= _requiredAmount;
    }

    /**
     * @dev Returns allowance for withdrawing the given token for sender address.
     * @param _tokenAddress An address of ERC20 token.
     * @return An uint value of allowance.
     */
    function getTokenWithdrawalAllowance(address _account, address _tokenAddress) public view returns(uint) {
        return tokensWithdrawalAllowanceForAddress[_account][_tokenAddress];
    }

    /**
     * @dev Accept and account incoming deposit in contract state.
     */
    function deposit() public payable {
        require(msg.value > 0);
        balance = balance.add(msg.value);
        emit IncomingPayment(msg.sender, msg.value, PaymentType.Ether, address(0x0));
    }
}
