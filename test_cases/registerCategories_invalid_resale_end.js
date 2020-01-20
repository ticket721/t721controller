const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs } = require('./utils');

module.exports = {
    registerCategories_invalid_resale_end: async function registerCategories_invalid_resale_end() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        const categories = [];

        const sale_start = Math.floor(Date.now() / 1000) + 1000;
        const sale_end = Math.floor(Date.now() / 1000) + 100000;
        const resale_start = Math.floor(Date.now() / 1000) + 100000;
        const resale_end = Math.floor(Date.now() / 1000) + 1000;

        categories.push({
            name: `regular`,
            hierarchy: 'root',
            amount: 100,
            sale_start: sale_start,
            sale_end: sale_end,
            resale_start: resale_start,
            resale_end: resale_end,
            authorization: ZADDRESS,
            attachment: ZADDRESS,
            prices: {
                [ERC20.address]: 100,
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        return expect(T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit})).to.eventually.be.rejectedWith('T721C::checkTimestamps | resale end is not after resale start');

    }
};
