const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs } = require('./utils');

module.exports = {
    getCategory_out_of_range: async function getCategory_out_of_range() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        const categories = [];

        const amount = 20;

        const sale_start = Math.floor(Date.now() / 1000) + 1000;
        const sale_end = Math.floor(Date.now() / 1000) + 100000;
        const resale_start = Math.floor(Date.now() / 1000) + 1000;
        const resale_end = Math.floor(Date.now() / 1000) + 100000;

        for (let idx = 0; idx < amount; ++idx) {
            categories.push({
                name: `regular_${idx}`,
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

        const receipt = await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});
        expect(receipt.logs.length).to.equal(amount);

        await expect(T721Controller.getCategory(id, amount * 2)).to.eventually.be.rejectedWith('T721C::getCategory | index out of range');
        return expect(T721Controller.getCategoryPrice(id, amount * 2, ERC20.address)).to.eventually.be.rejectedWith('T721C::getCategoryPrice | index out of range');

    }
};
