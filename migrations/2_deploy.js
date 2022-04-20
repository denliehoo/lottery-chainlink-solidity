const Lottery = artifacts.require('Lottery')
const { LinkToken } = require('../truffle/v0.4/LinkToken')


module.exports = async (deployer, network, [defaultAccount]) => {
  if (!network.startsWith('kovan')) { // set up to deploy on Kovan only
    console.log('Currenly only works with Kovan')
    LinkToken.setProvider(deployer.provider)
  } else {
    //https://docs.chain.link/docs/vrf-contracts/v1/  [work on changing to v2]
    const KOVAN_KEYHASH = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
    const KOVAN_VRF_COORDINATOR = '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9'
    //https://docs.chain.link/docs/ethereum-addresses/
    const ETH_USD_PRICE_FEED = '0x9326BFA02ADD2366b30bacB125260Af641031331'
    // https://docs.chain.link/docs/acquire-link/#:~:text=On%20Kovan%20our%20LINK%20token%20address%20is%3A%200xa36085F69e2889c224210F603D836748e7dC0088%20.
    const KOVAN_LINK_TOKEN = '0xa36085F69e2889c224210F603D836748e7dC0088'
    deployer.deploy(Lottery, ETH_USD_PRICE_FEED, KOVAN_VRF_COORDINATOR, KOVAN_LINK_TOKEN, KOVAN_KEYHASH)
  }
}
/*
constructor for the contract is:
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
    */

