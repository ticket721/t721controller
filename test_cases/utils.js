const ethers = require('ethers');

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

module.exports = {
    ZERO,
    ZEROSIG,
    revert,
    snapshot,
    expect_map,
    getEthersERC20Contract
};
