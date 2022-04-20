pragma solidity ^0.6.6;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.6/vendor/SafeMathChainlink.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

contract Lottery is VRFConsumerBase {
    using SafeMathChainlink for uint256;
    AggregatorV3Interface internal ethUsdPriceFeed;
    uint256 public usdEntryFee;
    uint256 public randomness;
    uint256 public fee;
    address payable[] public players;
    address public owner;
    address public recentWinner;
    bytes32 public keyHash;

    // which will be 0,1,2 respectively
    enum LotteryState {
        OPEN,
        CLOSED,
        CALCULATING_WINNER
    }
    LotteryState public lotteryState;

    event RequestedRandomness(bytes32 requestId);

    constructor(
        address _ethUsdPriceFeed,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash
    ) public VRFConsumerBase(_vrfCoordinator, _link) {
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        usdEntryFee = 50;
        lotteryState = LotteryState.CLOSED;
        fee = 10000000000000000; //0.1 LINK
        keyHash = _keyHash;

        owner = msg.sender;
    }

    // enter lottery
    function enter() public payable {
        require(msg.value >= getEntranceFee(), "Not enough ETH to enter");
        require(lotteryState == LotteryState.OPEN, "Lottery isn't opened");
        players.push(msg.sender);
    }

    function getEntranceFee() public view returns (uint256) {
        uint256 precision = 1 * 10**18;
        uint256 price = getLatestEthUsdPrice();
        // when doing division in solidity, we have to multiply first. We can divide a number which
        // returns a decimal because that will return 0
        uint256 costToEnter = (precision / price) * (usdEntryFee * 100000000);
        return costToEnter;
    }

    function getLatestEthUsdPrice() public view returns (uint256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = ethUsdPriceFeed.latestRoundData();
        return uint256(price);
    }

    function startLottery() public onlyOwner {
        require(
            lotteryState == LotteryState.CLOSED,
            "Error: A lottery is already ongoing"
        );
        lotteryState = LotteryState.OPEN;
    }

    function endLottery(uint256 userProvidedSeed) public onlyOwner {
        require(lotteryState == LotteryState.OPEN, "Can't end lottery yet");
        lotteryState = LotteryState.CALCULATING_WINNER;
        pickWinner(userProvidedSeed);
    }

    function pickWinner(uint256 userProvidedSeed) private returns (bytes32) {
        require(
            lotteryState == LotteryState.CALCULATING_WINNER,
            "Need to be calculating winner"
        );
        // function is from VRFConsumerBase chainlink import
        // lecturer inputted 1 more param: userProvidedSeed, but gave an error -cross check with docs that its not required
        //https://docs.chain.link/docs/chainlink-vrf-api-reference/v1/#:~:text=requestrandomness
        bytes32 requestId = requestRandomness(keyHash, fee);
        emit RequestedRandomness(requestId);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        require(randomness > 0, "random number not found");
        uint256 index = randomness % players.length; // the remaining will be 0 to (total players - 1)
        players[index].transfer(address(this).balance); //sends the address all the ETH in the smart contract
        lotteryState = LotteryState.CLOSED;
        randomness = randomness;
        recentWinner = players[index];
        players = new address payable[](0);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner");
        _;
    }
}
