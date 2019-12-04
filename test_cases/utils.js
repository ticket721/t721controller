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

    return [nums, category.authorization, strToB32(category.hierarchy), prices, currencies]
}

const mintToArgs = (currencies, owners) => {
    const nums = [];
    const addr = [];
    let sig = '0x';

    nums.push(currencies.length);
    nums.push(owners.length);

    for (const currency of currencies) {
        nums.push(currency.type);

        if (currency.type === 1) {
            nums.push(currency.amount);
        } else if (currency.type === 2) {
            nums.push(currency.amount);
            nums.push(currency.nonce);
            nums.push(currency.gasLimit);
            nums.push(currency.gasPrice);
            nums.push(currency.reward);

            sig = `${sig}${currency.sig.slice(2)}`;
        }

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
                name: 'T721 Controller Minting Authorization',
                version: '0',
                chainId: chain_id,
                verifyingContract: address
            },
            ['MintingAuthorization', MintingAuthorization]
        );
    }
}

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
    getEthersT721CContract
};
