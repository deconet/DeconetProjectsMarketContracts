# Analysis results for DecoEscrowStub.sol

## Message call to external contract
- SWC ID: 107
- Type: Informational
- Contract: DecoEscrowStub
- Function name: `distributeFunds(address,uint256)`
- PC address: 3727
- Estimated Gas Usage: 3344 - 5040

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In file: DecoEscrowStub.sol:24

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoEscrowStub
- Function name: `fallback`
- PC address: 14056
- Estimated Gas Usage: 530 - 625

### Description

This binary add operation can result in integer overflow.
In file: DecoEscrowStub.sol:24

# Analysis result for DecoTestToken

No issues found.
# Analysis results for DecoProjectsMock.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 616
- Estimated Gas Usage: 189 - 284

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 622
- Estimated Gas Usage: 204 - 299

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 628
- Estimated Gas Usage: 219 - 314

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 637
- Estimated Gas Usage: 244 - 339

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 643
- Estimated Gas Usage: 259 - 447

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 665
- Estimated Gas Usage: 327 - 3009

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 686
- Estimated Gas Usage: 381 - 3063

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 692
- Estimated Gas Usage: 396 - 3078

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 698
- Estimated Gas Usage: 411 - 3093

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 707
- Estimated Gas Usage: 436 - 3118

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 713
- Estimated Gas Usage: 451 - 3226

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 727
- Estimated Gas Usage: 487 - 3452

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 735
- Estimated Gas Usage: 510 - 5779

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:15

### Code

```
function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `checkIfProjectExists(bytes32)`
- PC address: 4337
- Estimated Gas Usage: 325 - 610

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Exception state
- SWC ID: 110
- Type: Informational
- Contract: DecoProjectsMock
- Function name: `clientProjects(address,uint256)`
- PC address: 6226
- Estimated Gas Usage: 798 - 1083

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. Note that explicit `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `clientProjects(address,uint256)`
- PC address: 6237
- Estimated Gas Usage: 850 - 1230

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `getProjectMilestonesCount(bytes32)`
- PC address: 6280
- Estimated Gas Usage: 404 - 689

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 18061
- Estimated Gas Usage: 663 - 6118

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 18084
- Estimated Gas Usage: 819 - 6650

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:6

### Code

```
oProjects {

```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 18090
- Estimated Gas Usage: 833 - 6664

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:8

### Code

```
ckCloningTes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 18137
- Estimated Gas Usage: 889 - 7143

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 18202
- Estimated Gas Usage: 924 - 7273

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19693
- Estimated Gas Usage: 1037 - 7620

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19748
- Estimated Gas Usage: 1093 - 7866

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19777
- Estimated Gas Usage: 1163 - 8405

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19800
- Estimated Gas Usage: 1131 - 8373

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:6

### Code

```
oProjects {

```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19806
- Estimated Gas Usage: 1145 - 8387

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:8

### Code

```
ckCloningTes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjectsMock
- Function name: `testIsMakersSignatureValid(address,bytes,string,address)`
- PC address: 19853
- Estimated Gas Usage: 1201 - 8866

### Description

This binary add operation can result in integer overflow.
In file: DecoProjectsMock.sol:28

# Analysis results for DecoEscrow.sol

## Message call to external contract
- SWC ID: 107
- Type: Informational
- Contract: DecoEscrow
- Function name: `distributeFunds(address,uint256)`
- PC address: 3629
- Estimated Gas Usage: 3344 - 5040

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In file: DecoEscrow.sol:213

### Code

```
relayContract.feesWithdrawalAddress()
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoEscrow
- Function name: `fallback`
- PC address: 14173
- Estimated Gas Usage: 530 - 625

### Description

This binary add operation can result in integer overflow.
In file: DecoEscrow.sol:35

### Code

```
ken t
```

# Analysis results for DecoArbitrationStub.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `rejectProposal(bytes32)`
- PC address: 3299
- Estimated Gas Usage: 330 - 615

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `rejectProposal(bytes32)`
- PC address: 3546
- Estimated Gas Usage: 1228 - 1843

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `disputes(bytes32)`
- PC address: 3999
- Estimated Gas Usage: 766 - 1381

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `disputes(bytes32)`
- PC address: 4037
- Estimated Gas Usage: 1214 - 2159

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `disputes(bytes32)`
- PC address: 4043
- Estimated Gas Usage: 1626 - 2571

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `disputes(bytes32)`
- PC address: 4049
- Estimated Gas Usage: 2038 - 2983

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `disputes(bytes32)`
- PC address: 4068
- Estimated Gas Usage: 2486 - 3761

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitrationStub
- Function name: `rejectProposal(bytes32)`
- PC address: 10972
- Estimated Gas Usage: 1670 - 2285

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitrationStub.sol:25

# Analysis result for SafeMath

No issues found.
# Analysis result for DecoMilestonesStub

No issues found.
# Analysis result for DecoEscrowFactory

No issues found.
# Analysis results for DecoMilestonesMock.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestonesMock
- Function name: `markMilestoneAsOnHold(bytes32,bool)`
- PC address: 2788
- Estimated Gas Usage: 1675 - 2055

### Description

This binary multiply operation can result in integer overflow.
In file: DecoMilestonesMock.sol:43

### Code

```
milestones[milestones.length - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestonesMock
- Function name: `markMilestoneAsOnHold(bytes32,bool)`
- PC address: 2789
- Estimated Gas Usage: 1680 - 2060

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestonesMock.sol:43

### Code

```
milestones[milestones.length - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestonesMock
- Function name: `markMilestoneAsOnHold(bytes32,bool)`
- PC address: 2796
- Estimated Gas Usage: 1697 - 2077

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestonesMock.sol:44

### Code

```
milestone.isOnHold
```

## Message call to external contract
- SWC ID: 107
- Type: Informational
- Contract: DecoMilestonesMock
- Function name: `deliverLastMilestone(bytes32)`
- PC address: 2968
- Estimated Gas Usage: 1469 - 2175

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In file: DecoMilestonesMock.sol:64

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestonesMock
- Function name: `deliverLastMilestone(bytes32)`
- PC address: 3009
- Estimated Gas Usage: 2237 - 37036

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestonesMock.sol:64

# Analysis results for DecoArbitration.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `rejectProposal(bytes32)`
- PC address: 3030
- Estimated Gas Usage: 330 - 615

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:105

### Code

```
dispute.respondent
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `rejectProposal(bytes32)`
- PC address: 3277
- Estimated Gas Usage: 1228 - 1843

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:108

### Code

```
dispute.startedTime
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `disputes(bytes32)`
- PC address: 3730
- Estimated Gas Usage: 766 - 1381

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:38

### Code

```
mapping (bytes32 => Dispute) public disputes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `disputes(bytes32)`
- PC address: 3768
- Estimated Gas Usage: 1214 - 2159

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:38

### Code

```
mapping (bytes32 => Dispute) public disputes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `disputes(bytes32)`
- PC address: 3774
- Estimated Gas Usage: 1626 - 2571

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:38

### Code

```
mapping (bytes32 => Dispute) public disputes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `disputes(bytes32)`
- PC address: 3780
- Estimated Gas Usage: 2038 - 2983

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:38

### Code

```
mapping (bytes32 => Dispute) public disputes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `disputes(bytes32)`
- PC address: 3799
- Estimated Gas Usage: 2486 - 3761

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:38

### Code

```
mapping (bytes32 => Dispute) public disputes
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `getDisputeStartTime(bytes32)`
- PC address: 4461
- Estimated Gas Usage: 404 - 689

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:257

### Code

```
disputes[_idHash].startedTime
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoArbitration
- Function name: `rejectProposal(bytes32)`
- PC address: 10470
- Estimated Gas Usage: 1670 - 2285

### Description

This binary add operation can result in integer overflow.
In file: DecoArbitration.sol:41

### Code

```
ev St
```

# Analysis result for DecoBaseProjectsMarketplace

No issues found.
# Analysis results for DecoMilestones.sol

## Message call to external contract
- SWC ID: 107
- Type: Informational
- Contract: DecoMilestones
- Function name: `deliverLastMilestone(bytes32)`
- PC address: 2306
- Estimated Gas Usage: 1447 - 2153

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In file: DecoMilestones.sol:131

### Code

```
DecoRelay(relayContractAddress).projectsContractAddress()
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `deliverLastMilestone(bytes32)`
- PC address: 2347
- Estimated Gas Usage: 2215 - 37014

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:131

### Code

```
DecoRelay(relayContractAddress).projectsContractAddress()
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4135
- Estimated Gas Usage: 1609 - 3222

### Description

This binary multiply operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4136
- Estimated Gas Usage: 1614 - 3227

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4259
- Estimated Gas Usage: 3069 - 6145

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4269
- Estimated Gas Usage: 3493 - 6664

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4355
- Estimated Gas Usage: 3965 - 7561

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4365
- Estimated Gas Usage: 4389 - 8080

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4375
- Estimated Gas Usage: 4813 - 8599

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoMilestones
- Function name: `canStartDispute(bytes32)`
- PC address: 4385
- Estimated Gas Usage: 5237 - 9118

### Description

This binary add operation can result in integer overflow.
In file: DecoMilestones.sol:346

### Code

```
Milestone memory lastMilestone = projectMilestones[_idHash][milestonesCount - 1]
```

# Analysis results for DecoProjects.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `getInfoForDisputeAndValidate(bytes32,address,address,address)`
- PC address: 3961
- Estimated Gas Usage: 832 - 2540

### Description

This binary add operation can result in integer overflow.
In file: DecoProjects.sol:357

### Code

```
projects[_agreementHash].client
```

## Exception state
- SWC ID: 110
- Type: Informational
- Contract: DecoProjects
- Function name: `clientProjects(address,uint256)`
- PC address: 5850
- Estimated Gas Usage: 776 - 1061

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. Note that explicit `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjects.sol:67

### Code

```
mapping (address => bytes32[]) public clientProjects
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `clientProjects(address,uint256)`
- PC address: 5861
- Estimated Gas Usage: 828 - 1208

### Description

This binary add operation can result in integer overflow.
In file: DecoProjects.sol:67

### Code

```
mapping (address => bytes32[]) public clientProjects
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `getProjectMilestonesCount(bytes32)`
- PC address: 5904
- Estimated Gas Usage: 382 - 667

### Description

This binary add operation can result in integer overflow.
In file: DecoProjects.sol:375

### Code

```
projects[_agreementHash].milestonesCount
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `getMakerProjects(address)`
- PC address: 5996
- Estimated Gas Usage: 801 - 1086

### Description

This binary multiply operation can result in integer overflow.
In file: DecoProjects.sol:348

### Code

```
return makerProjects[_maker]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `getMakerProjects(address)`
- PC address: 5999
- Estimated Gas Usage: 809 - 1094

### Description

This binary add operation can result in integer overflow.
In file: DecoProjects.sol:348

### Code

```
return makerProjects[_maker]
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoProjects
- Function name: `getMakerProjects(address)`
- PC address: 6005
- Estimated Gas Usage: 824 - 1202

### Description

This binary add operation can result in integer overflow.
In file: DecoProjects.sol:348

### Code

```
return makerProjects[_maker]
```

# Analysis result for ECDSA

No issues found.
# Analysis result for DecoArbitrationTargetStub

No issues found.
# Analysis results for DecoEscrowMock.sol

## Message call to external contract
- SWC ID: 107
- Type: Informational
- Contract: DecoEscrowMock
- Function name: `distributeFunds(address,uint256)`
- PC address: 3885
- Estimated Gas Usage: 3344 - 5040

### Description

This contract executes a message call to to another contract. Make sure that the called contract is trusted and does not execute user-supplied code.
In file: DecoEscrowMock.sol:29

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoEscrowMock
- Function name: `fallback`
- PC address: 15226
- Estimated Gas Usage: 530 - 625

### Description

This binary add operation can result in integer overflow.
In file: DecoEscrowMock.sol:29

# Analysis results for DecoTest.sol

## Message call to external contract
- SWC ID: 107
- Type: Warning
- Contract: DecoTest
- Function name: `testGetInfoAndValidateForDispute(bytes32,address,address,address,uint256,uint8,address,address)`
- PC address: 589
- Estimated Gas Usage: 1407 - 2163

### Description

This contract executes a message call to an address provided as a function argument. Generally, it is not recommended to call user-supplied addresses using Solidity's call() construct. Note that attackers might leverage reentrancy attacks to exploit race conditions or manipulate this contract's state.
In file: DecoTest.sol:20

### Code

```
decoProjects.getInfoForDisputeAndValidate(
                _agreementHash,
                _respondent,
                _initiator,
                _arbiter
        )
```

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: DecoTest
- Function name: `testGetInfoAndValidateForDispute(bytes32,address,address,address,uint256,uint8,address,address)`
- PC address: 630
- Estimated Gas Usage: 2175 - 37024

### Description

This binary add operation can result in integer overflow.
In file: DecoTest.sol:20

### Code

```
decoProjects.getInfoForDisputeAndValidate(
                _agreementHash,
                _respondent,
                _initiator,
                _arbiter
        )
```

# Analysis result for DecoProjectsStub

No issues found.
# Analysis result for CloneFactory

No issues found.
# Analysis results for ERC20.sol

## Integer Overflow
- SWC ID: 101
- Type: Warning
- Contract: ERC20
- Function name: `increaseAllowance(address,uint256)`
- PC address: 3618
- Estimated Gas Usage: 953 - 1428

### Description

This binary add operation can result in integer overflow.
In file: ERC20.sol:45

### Code

```
  add
```

# Analysis result for DecoRelay

No issues found.
