const { assert } = require('chai')
const truffleAssert = require('truffle-assertions') //npm i truffle-assertions

contract('Lottery', accounts => {
    const Lottery = artifacts.require('Lottery')
    const VRFCoordinatorMock = artifacts.require('VRFCoordinatorMock')
    const MockPriceFeed = artifacts.require('MockV3Aggregator')
    const { LinkToken } = require("../truffle/v0.4/LinkToken")

    const defaultAccount = accounts[0]
    const player1 = accounts[1]
    const player2 = accounts[2]
    const player3 = accounts[3]

    let lottery, vrfCoordinatorMock, seed, link, keyHash, fee, mockPriceFeed;

    describe('request a random number', () => {
        let price = '200000000000' // 2000 + 8 dps price in ETHUSD is 2000 USD
        beforeEach(async () => { //before each test, we set these params and deploy accordingly; hence each test ('its' will have these settings)
            keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
            fee = '10000000000000000' //0.1
            seed = 123
            link = await LinkToken.new({ from: defaultAccount })
            mockPriceFeed = await MockPriceFeed.new(8, price, { from: defaultAccount })
            vrfCoordinatorMock = await VRFCoordinatorMock.new(link.address, { from: defaultAccount })
            lottery = await Lottery.new(mockPriceFeed.address, vrfCoordinatorMock.address, link.address, keyHash, { from: defaultAccount })
        })
        it('lottery starts in a closed state', async () => {
            assert(await lottery.lotteryState() == 1) // 0: open , 1: closed , 2: calculating winner
        })
        it('correctly gets entrance fee', async () => {
            let entranceFee = await lottery.getEntranceFee()
            // if usd entry fee is 50 USD and current ETH price is 2000 USD, 
            // 2000 USD -> 1 ETH ; 50 USD 0.025 ETH (in gwei)
            assert.equal(entranceFee.toString(), '25000000000000000')
        })
        it('Disallows entrants without enough money', async () => {
            await lottery.startLottery({ from: defaultAccount })
            await truffleAssert.reverts( // this will revert if the value of the the account it is sending from is 0 (i.e. it has 0 eth (not enough))
                lottery.enter({ from: defaultAccount, value: 0 })
            )
        })
        it('Plays the game correctly', async () => {
            await lottery.startLottery({ from: defaultAccount })
            let entranceFee = await lottery.getEntranceFee()
            lottery.enter({ from: player1, value: entranceFee.toString() })
            lottery.enter({ from: player2, value: entranceFee.toString() })
            lottery.enter({ from: player3, value: entranceFee.toString() })
            // here we are sending 1LINK actually although the units is till in ether i.e. 10**18
            await link.transfer(lottery.address, web3.utils.toWei('1', 'ether'), { from: defaultAccount })
            let transaction = await lottery.endLottery({ from: defaultAccount })
            // this is the third log that is emitted because the chainlink contract also emits logs
            let requestId = transaction.receipt.rawLogs[3].topics[0]

            // we are simulating that 3 is the random number that we receive from the contract
            await vrfCoordinatorMock.callBackWithRandomness(requestId, '3', lottery.address, { from: defaultAccount })
            let recentWinner = await lottery.recentWinner()
            // since 3 is the random number, when we do the lottery, the winner of the game would be the player with index
            // 3%3 == 0 ; i.e. the player with index 0 ; players[0]. in this case, it is player1 since he entered first and is the 0th index
            assert.equal(recentWinner, player1)
        })



    })
})