pragma solidity 0.4.24;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract DecoEscrow is Ownable {

    event Payment (
        address sender,
        uint depositAmount,
        PaymentType paymentType
    );

    enum PaymentType { Ether, Erc20 }

    function () public payable {
        emit Payment(msg.sender, msg.value, PaymentType.Ether);
    }
}
