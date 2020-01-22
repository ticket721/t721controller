const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32, mintToArgs, MintingAuthorizer } = require('./utils');
const {Wallet} = require('ethers');

module.exports = {
    mint_authorization_code_duplicate_two_tx: async function mint_authorization_code_duplicate_two_tx() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20, Dai} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
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
            authorization: authorizer.address,
            attachment: ZADDRESS,
            prices: {
                [ERC20.address]: 100,
                [Dai.address]: 200
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});

        const currencies = [
            {
                type: 1,
                address: ERC20.address,
                amount: 250
            },
            {
                type: 1,
                address: Dai.address,
                amount: 500
            }
        ];

        const owners = [
            {
                address: accounts[0],
                code: 1
            },
            {
                address: accounts[1],
                code: 2
            },
            {
                address: accounts[2],
                code: 3
            },
            {
                address: accounts[3],
                code: 4
            },
            {
                address: accounts[4],
                code: 5
            }
        ];

        const network_id = await web3.eth.net.getId();
        const signer = new MintingAuthorizer(network_id, T721Controller.address);

        for (let owner_idx = 0; owner_idx < owners.length; ++owner_idx) {
            const payload = signer.generatePayload({
                code: owners[owner_idx].code,
                emitter: authorizer.address,
                minter: owners[owner_idx].address,
                group: id,
                category: strToB32('regular')
            }, 'MintingAuthorization');

            const signature = await signer.sign(authorizer.privateKey, payload);

            owners[owner_idx].sig = signature.hex;

        }

        const [mint_nums, mint_addr, mint_sig] = mintToArgs(currencies, owners);

        await ERC20.mint(accounts[0], 100 * 5);
        await Dai.mint(accounts[0], 200 * 5);
        await ERC20.approve(T721Controller.address, 100 * 5, {from: accounts[0]});
        await Dai.approve(T721Controller.address, 200 * 5, {from: accounts[0]});
        await T721Controller.mint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]});
        await expect(T721Controller.verifyMint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::verifyMint | authorization code already used');
        return expect(T721Controller.mint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::mint | authorization code already used');

    }
};
