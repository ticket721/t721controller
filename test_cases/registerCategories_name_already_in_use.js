const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs } = require('./utils');

module.exports = {
    registerCategories_name_already_in_use: async function registerCategories_name_already_in_use() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        const categories = [];

        const amount = 2;

        const sale_start = Math.floor(Date.now() / 1000) + 1000;
        const sale_end = Math.floor(Date.now() / 1000) + 100000;
        const resale_start = Math.floor(Date.now() / 1000) + 1000;
        const resale_end = Math.floor(Date.now() / 1000) + 100000;

        for (let idx = 0; idx < amount; ++idx) {
            categories.push({
                name: `regular`,
                hierarchy: 'root',
                amount: 100,
                sale_start: sale_start + idx,
                sale_end: sale_end + idx,
                resale_start: resale_start + idx,
                resale_end: resale_end + idx,
                authorization: ZADDRESS,
                attachment: ZADDRESS,
                prices: {
                    [ERC20.address]: 100,
                }
            })
        }

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        return expect(T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit})).to.eventually.be.rejectedWith('T721C::registerCategories | category name already in use in group');
    }
};
