const { BigNumber } = require('ethers/utils');

const ethers = require('ethers');
const strhex = require('string-hex');
const {EIP712Signer} = require('@ticket721/e712');

const expect_map = async (dai, daiplus, t721, accounts, dai_balances, daiplus_balances, t721_balances, expect) => {

    for (let idx = 0; idx < accounts.length; ++idx) {

        const account = accounts[idx];

        const dai_balance = (await dai.balanceOf(account)).toNumber();
        const daiplus_balance = (await daiplus.balanceOf(account)).toNumber();
        const t721_balance = (await t721.balanceOf(account)).toNumber();

        expect(dai_balance).to.equal(dai_balances[idx]);
        expect(daiplus_balance).to.equal(daiplus_balances[idx]);
        expect(t721_balance).to.equal(t721_balances[idx]);

    }

};

const getEthersERC20Contract = async (erc20_artifact, erc20_instance, wallet) => {
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const connected_wallet = new ethers.Wallet(wallet.privateKey, provider);

    const devdai_factory = new ethers.ContractFactory(erc20_artifact.abi, erc20_artifact.deployedBytecode, wallet, wallet);
    const devdai_ethers = await devdai_factory.attach(erc20_instance.address);
    return devdai_ethers.connect(connected_wallet)
};

const getEthersT721CContract = async (wallet) => {
    const t721c = artifacts.require('T721Controller_v0');
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const connected_wallet = new ethers.Wallet(wallet.privateKey, provider);
    const truffle_devdai = await t721c.deployed();

    const t721c_factory = new ethers.ContractFactory(t721c.abi, t721c.deployedBytecode, wallet, wallet);
    const t721c_ethers = await t721c_factory.attach(truffle_devdai.address);
    return t721c_ethers.connect(connected_wallet)
};

const getEthersT721ACContract = async (wallet) => {
    const t721c = artifacts.require('T721AttachmentsController_v0');
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const connected_wallet = new ethers.Wallet(wallet.privateKey, provider);
    const truffle_devdai = await t721c.deployed();

    const t721c_factory = new ethers.ContractFactory(t721c.abi, t721c.deployedBytecode, wallet, wallet);
    const t721c_ethers = await t721c_factory.attach(truffle_devdai.address);
    return t721c_ethers.connect(connected_wallet)
};


const snapshot = () => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_snapshot',
            params: [],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const revert = (snap_id) => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_revert',
            params: [snap_id],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const ZERO = '0x0000000000000000000000000000000000000000';
const ZEROSIG = `0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`

const strToB32 = (str) => {
    let hex = strhex(str);
    if (hex.length % 2) {
        hex = `0${hex}`;
    }

    const pad = 64 - hex.length;

    return `0x${hex}${"0".repeat(pad)}`;
};

const catToEditArgs = (category) => {
    const nums = [];

    nums.push(category.amount);
    nums.push(category.sale_start);
    nums.push(category.sale_end);
    nums.push(category.resale_start);
    nums.push(category.resale_end);

    const currencies = [];
    const prices = [];

    for (const address of Object.keys(category.prices)) {
        currencies.push(address);
        prices.push(category.prices[address]);
    }

    return [nums, category.authorization, category.attachment, strToB32(category.hierarchy), prices, currencies]
};

const attachmentToArgs = (attachments, group_id, category_idx) => {
    const att = [group_id];
    const nums = [category_idx];
    const addr = [];
    const prices = {};
    let sig = '0x';

    for (const attachment of attachments) {
        att.push(strToB32(attachment.name));
        nums.push(Object.keys(attachment.prices).length);

        for (const curr of Object.keys(attachment.prices)) {
            nums.push(attachment.prices[curr].price);
            addr.push(curr);

            if (prices[curr] === undefined) {
                prices[curr] = {
                    total: 0
                }
            }

            prices[curr].total += attachment.prices[curr].price;

        }


        if (attachment.sig) {
            sig = `${sig}${attachment.sig.slice(2)}`;
            nums.push(attachment.code);
        }

        nums.push(attachment.amount);
    }

    const totals = [];
    const currencies = [];

    for (const curr of Object.keys(prices)) {
        totals.push(prices[curr].total);
        currencies.push(curr);
    }

    return [att, nums, addr, sig, [...nums, Object.keys(prices).length,...totals], [...addr, ...currencies]];
};

const mintToArgs = (currencies, owners) => {
    const nums = [];
    const addr = [];
    let sig = '0x';

    nums.push(currencies.length);
    nums.push(owners.length);

    for (const currency of currencies) {

        nums.push(currency.amount);
        addr.push(currency.address);

    }

    for (const owner of owners) {

        if (owner.sig && owner.code) {
            sig = `${sig}${owner.sig.slice(2)}`;
            nums.push(owner.code)
        }

        addr.push(owner.address);
    }

    return [nums, addr, sig];
};

const catToArgs = (categories) => {
    const nums = [];
    const addr = [];
    const byte_data = [];

    for (const cat of categories) {
        nums.push(cat.amount);
        nums.push(cat.sale_start);
        nums.push(cat.sale_end);
        nums.push(cat.resale_start);
        nums.push(cat.resale_end);
        nums.push(Object.keys(cat.prices).length);

        addr.push(cat.authorization);
        addr.push(cat.attachment);

        for (const address of Object.keys(cat.prices)) {
            addr.push(address);
            nums.push(cat.prices[address])
        }

        byte_data.push(strToB32(cat.name));
        byte_data.push(strToB32(cat.hierarchy));

    }

    return [nums, addr, byte_data]
};

const MintingAuthorization = [
    {
        name: 'code',
        type: 'uint256'
    },
    {
        name: 'emitter',
        type: 'address'
    },
    {
        name: 'minter',
        type: 'address'
    },
    {
        name: 'group',
        type: 'bytes32'
    },
    {
        name: 'category',
        type: 'bytes32'
    }
];

class MintingAuthorizer extends EIP712Signer {
    constructor(chain_id, address) {
        super({
                name: 'T721 Controller',
                version: '0',
                chainId: chain_id,
                verifyingContract: address
            },
            ['MintingAuthorization', MintingAuthorization]
        );
    }
}

const Attachment = [
    {
        name: 'group',
        type: 'bytes32'
    },
    {
        name: 'category',
        type: 'uint256'
    },
    {
        name: 'attachment',
        type: 'bytes32'
    },
    {
        name: 'amount',
        type: 'uint256'
    },
    {
        name: 'prices',
        type: 'bytes'
    },
    {
        name: 'currencies',
        type: 'bytes'
    },
    {
        name: 'code',
        type: 'uint256'
    }
];

class AttachmentAuthorizer extends EIP712Signer {
    constructor(chain_id, address) {
        super({
                name: 'T721 Attachments Controller',
                version: '0',
                chainId: chain_id,
                verifyingContract: address
            },
            ['Attachment', Attachment]
        );
    }
}

const encodedU256 = (num) => {
    const hexed = (new BigNumber(num)).toHexString().slice(2);
    return `${"0".repeat(64 - hexed.length)}${hexed}`;
};

const injectAttachmentSigs = async (attachments, chain_id, address, group_id, category_idx, wallet) => {

    const signer = new AttachmentAuthorizer(chain_id, address);

    for (const att of attachments) {
        const payload = {
            group: group_id,
            category: category_idx,
            attachment: strToB32(att.name),
            amount: att.amount,
            prices: "0x",
            currencies: "0x",
            code: att.code
        };

        for (const curr of Object.keys(att.prices)) {

            payload.prices = `${payload.prices}${encodedU256(att.prices[curr].price)}`;
            payload.currencies = `${payload.currencies}${curr.slice(2)}`;
        }

        const formatted_payload = signer.generatePayload(payload, 'Attachment');
        const sig = await signer.sign(wallet.privateKey, formatted_payload);
        att.sig = sig.hex;

    }

};

module.exports = {
    ZERO,
    ZEROSIG,
    revert,
    snapshot,
    expect_map,
    getEthersERC20Contract,
    catToArgs,
    catToEditArgs,
    mintToArgs,
    strToB32,
    MintingAuthorizer,
    AttachmentAuthorizer,
    getEthersT721CContract,
    getEthersT721ACContract,
    attachmentToArgs,
    injectAttachmentSigs
};
