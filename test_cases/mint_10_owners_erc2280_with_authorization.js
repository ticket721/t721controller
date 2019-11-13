const { CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32, mintToArgs, MintingAuthorizer, getEthersT721CContract } = require('./utils');
const {Wallet} = require('ethers');
const {ERC2280Signer} = require('@ticket721/e712');

module.exports = {
    mint_10_owners_erc2280_with_authorization: async function mint_10_owners_erc2280_with_authorization() {

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
            authorization: authorizer.address,
            prices: {
                [ERC2280.address]: 200
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});

        const currencies = [
            {
                type: 2,
                address: ERC2280.address,
                amount: 2000
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

        const buyer = Wallet.createRandom();
        await web3.eth.sendTransaction({from: accounts[0], to: buyer.address, value: web3.utils.toWei('1', 'ether')});

        const domain_name = 'ERC2280Mock';
        const domain_version = '1';
        const domain_chain_id = 1;
        const domain_contract = ERC2280.address;

        const transfer_recipient = T721Controller.address;

        const esigner = new ERC2280Signer(domain_name, domain_version, domain_chain_id, domain_contract);

        const sig = await esigner.transfer(transfer_recipient, 2000, {
            signer: buyer.address,
            relayer: T721Controller.address
        }, {
            nonce: 0,
            gasLimit: 0,
            gasPrice: 0,
            reward: 0
        }, buyer.privateKey);

        currencies[0] = {
            ...currencies[0],
            sig: sig.hex,
            nonce: 0,
            gasLimit: 0,
            gasPrice: 0,
            reward: 0,
            signer: buyer.address,
            relayer: T721Controller.address,
        };

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

        await ERC2280.mint(buyer.address, 200 * 10, {from: accounts[0]});
        const T721CE = await getEthersT721CContract(buyer, T721Controller);
        await T721CE.functions.verifyMint(id, 0, mint_nums, mint_addr, mint_sig);
        await T721CE.functions.mint(id, 0, mint_nums, mint_addr, mint_sig);

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

        expect((await ERC2280.balanceOf(accounts[0])).toNumber()).to.equal(0);

        expect((await T721Controller.balanceOf(id, ERC2280.address)).toNumber()).to.equal(2000);

    }
};
