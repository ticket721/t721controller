const { CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32, mintToArgs, MintingAuthorizer } = require('./utils');
const {Wallet} = require('ethers');

module.exports = {
    mint_erc20_unauthorized_currency: async function mint_erc20_unauthorized_currency() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC721, ERC20, ERC2280} = this.contracts;
        const T721Controller = this.contracts[CONTRACT_NAME];
        const authorizer = Wallet.createRandom();

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        const categories = [];

        const sale_start = Math.floor(Date.now() / 1000) + 1000;
        const sale_end = Math.floor(Date.now() / 1000) + 100000;
        const resale_start = Math.floor(Date.now() / 1000) + 1000;
        const resale_end = Math.floor(Date.now() / 1000) + 100000;

        categories.push({
            name: `regular`,
            hierarchy: 'root',
            amount: 100,
            sale_start: sale_start,
            sale_end: sale_end,
            resale_start: resale_start,
            resale_end: resale_end,
            authorization: ZADDRESS,
            prices: {
                [ERC20.address]: 100,
                [ERC2280.address]: 200
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});

        const currencies = [
            {
                type: 1,
                address: ERC20.address,
                amount: 1000
            }
        ];

        const owners = [
            {
                address: accounts[0],
            },
            {
                address: accounts[1],
            },
            {
                address: accounts[2],
            },
            {
                address: accounts[3],
            },
            {
                address: accounts[4],
            },
            {
                address: accounts[5],
            },
            {
                address: accounts[6],
            },
            {
                address: accounts[7],
            },
            {
                address: accounts[8],
            },
            {
                address: accounts[9],
            },
        ];

        const [mint_nums, mint_addr, mint_sig] = mintToArgs(currencies, owners);
        mint_addr[0] = accounts[0];

        await ERC20.mint(accounts[0], 100 * 10);
        await ERC20.approve(T721Controller.address, 100 * 10, {from: accounts[0]});
        await expect(T721Controller.verifyMint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::verifyERC20Payment | unauthorized erc20 currency');
        return expect(T721Controller.mint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::processERC20Payment | unauthorized erc20 currency');
    }
};
