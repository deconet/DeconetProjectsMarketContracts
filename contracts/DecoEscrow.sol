pragma solidity 0.4.24;

import "./DecoMilestones.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract DecoEscrow is Ownable {
    mapping(address => bool) public authorizedAddresses;

    uint public escrowBalance;
    mapping (address => uint) public withdrawAllowancesForAddress;

    address[] public depositedTokensAddresses;
    mapping(address => uint) public escrowTokensBalance;

    mapping(address => mapping(address => uint)) public tokensWithdrawAllowanceForAddress;

    event IncomingPayment (
        address from,
        uint depositAmount,
        PaymentType paymentType,
        address tokenAddress
    );

    enum PaymentType { Ether, Erc20 }

    modifier onlyAuthorized() {
        require(authorizedAddresses[msg.sender]);
        _;
    }

    function () public payable {
        deposit();
    }

    function deposit() public {
        // emit IncomingPayment(msg.sender, msg.value, PaymentType.Ether, address(0x0));
    }

    function depostErc20(address _tokenAddress, uint _amount) external {
    }

    function withdraw(uint amount) external {
    }

    function withdrawErc20(address _tokenAddress, uint amount) external {
    }

    function distributeFunds(
        address _destination,
        uint amount
    )
        external
        onlyAuthorized
    {
    }

    function distributeTokenFunds(
        address _destination,
        address _token,
        uint _amount
    )
        external
        onlyAuthorized
    {
    }
}
