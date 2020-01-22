const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME } = require('./constants');
const { catToArgs, strToB32, mintToArgs, MintingAuthorizer, attachmentToArgs, injectAttachmentSigs } = require('./utils');
const {Wallet} = require('ethers');

module.exports = {
    fixAttachments_invalid_group_id: async function fixAttachment_invalid_group_id() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC721, ERC20, Dai} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
        const T721AttachmentsController = this.contracts[T721AC_CONTRACT_NAME];
        const authorizer = Wallet.createRandom();
        const attachment = Wallet.createRandom();

        await T721Controller.whitelistCurrency(ERC20.address, 0, 0);
        await T721Controller.whitelistCurrency(Dai.address, 0, 0);
        await T721Controller.whitelistCurrency(Dai.address, 0, 0);

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
            attachment: attachment.address,
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
                amount: 500
            },
            {
                type: 1,
                address: Dai.address,
                amount: 1000
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
        await T721Controller.verifyMint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]});
        await T721Controller.mint(id, 0, mint_nums, mint_addr, mint_sig, {from: accounts[0]});

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

        const ticket_id = (await ERC721.tokenOfOwnerByIndex(accounts[0], 0)).toNumber();

        const attachments = [
            {
                name: 'beer',
                amount: 2,
                code: 1,
                prices: {
                    [ERC20.address]: {
                        price: 100,
                    }
                }
            },
            {
                name: 'chips',
                amount: 2,
                code: 2,
                prices: {
                    [ERC20.address]: {
                        price: 200,
                    }
                }
            },
            {
                name: 'coca',
                amount: 10,
                code: 3,
                prices: {
                    [ERC20.address]: {
                        price: 1000,
                    }
                }
            },
        ];

        await injectAttachmentSigs(attachments, network_id, T721AttachmentsController.address, strToB32('false id'), 0, attachment);
        const [att_names, att_nums, att_addr, att_sig, att_test_nums, att_test_addr] = attachmentToArgs(attachments, strToB32('false id'), 0);

        await ERC20.mint(accounts[0], 1300);
        await ERC20.approve(T721AttachmentsController.address, 1300, {from: accounts[0]});
        await expect(T721AttachmentsController.verifyAttachments(ticket_id, att_names, att_test_nums, att_test_addr, att_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721AC::verifyAttachments | invalid group_id');
        return expect(T721AttachmentsController.fixAttachments(ticket_id, att_names, att_nums, att_addr, att_sig, {from: accounts[0]})).to.eventually.be.rejectedWith('T721AC::fixAttachments | invalid group_id')

    }
};
