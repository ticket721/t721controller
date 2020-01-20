const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32, mintToArgs, MintingAuthorizer } = require('./utils');
const {Wallet} = require('ethers');

module.exports = {
    mint_10_owners_2_currencies_with_authorization: async function mint_10_owners_2_currencies_with_authorization() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC721, ERC20, Dai} = this.contracts;
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
                [Dai.address]: 100,
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});

        const currencies = [
            {
                address: ERC20.address,
                amount: 500
            },
            {
                address: Dai.address,
                amount: 500
            },
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
            },
            {
                address: accounts[5],
                code: 6
            },
            {
                address: accounts[6],
                code: 7
            },
            {
                address: accounts[7],
                code: 8
            },
            {
                address: accounts[8],
                code: 9
            },
            {
                address: accounts[9],
                code: 10
            },
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

        await ERC20.mint(accounts[0], 500);
        await ERC20.approve(T721Controller.address, 500, {from: accounts[0]});
        await Dai.mint(accounts[0], 500);
        await Dai.approve(T721Controller.address, 500, {from: accounts[0]});
        await T721Controller.verifyMint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]});
        const rec = await T721Controller.mint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]});

        expect((await ERC721.balanceOf(accounts[0])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[1])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[2])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[3])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[4])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[5])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[6])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[7])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[8])).toNumber()).to.equal(1);
        expect((await ERC721.balanceOf(accounts[9])).toNumber()).to.equal(1);

        expect((await ERC20.balanceOf(accounts[0])).toNumber()).to.equal(0);

        const payment_1_fee = (await T721Controller.getFee(ERC20.address, 500)).toNumber();
        const payment_2_fee = (await T721Controller.getFee(Dai.address, 500)).toNumber();

        expect((await T721Controller.balanceOf(id, ERC20.address)).toNumber()).to.equal(500 - payment_1_fee);
        expect((await T721Controller.balanceOf(id, Dai.address)).toNumber()).to.equal(500 - payment_2_fee);
        expect((await ERC20.balanceOf(accounts[9])).toNumber()).to.equal(payment_1_fee);
        expect((await Dai.balanceOf(accounts[9])).toNumber()).to.equal(payment_2_fee);

        let idx = 0;
        for (const log of rec.logs) {
            expect(log.args.group_id).to.equal(id);
            expect(log.args.category_name.toLowerCase()).to.equal(strToB32('regular').toLowerCase());
            expect(log.args.owner.toLowerCase()).to.equal(owners[idx].address.toLowerCase());
            expect(log.args.buyer.toLowerCase()).to.equal(accounts[0].toLowerCase());
            const ticket_id = (await ERC721.tokenOfOwnerByIndex(owners[idx].address, 0)).toNumber();
            expect(log.args.ticket_id.toNumber()).to.equal(ticket_id);
            ++idx;
        }

        await expect(T721Controller.withdraw(id, ERC20.address, 500, accounts[0])).to.eventually.be.rejectedWith('T721C::withdraw | balance too low');

        await T721Controller.withdraw(id, ERC20.address, 500 - payment_1_fee, accounts[0]);
        await T721Controller.withdraw(id, Dai.address, 500 - payment_2_fee, accounts[0]);

        expect((await ERC20.balanceOf(accounts[0])).toNumber()).to.equal(500 - payment_1_fee);
        expect((await Dai.balanceOf(accounts[0])).toNumber()).to.equal(500 - payment_1_fee);

    }
};
