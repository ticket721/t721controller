const { CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32 } = require('./utils');

module.exports = {
    registerCategories_duplicate_currency: async function registerCategories_duplicate_currency() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20, ERC2280} = this.contracts;
        const T721Controller = this.contracts[CONTRACT_NAME];

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
            authorization: ZADDRESS,
            prices: {
                [ERC20.address]: 100,
                [ERC2280.address]: 200
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        nums[5] += 1; // Increase currency count
        nums.push(nums[nums.length - 1]);
        addr.push(addr[addr.length - 1]);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        return expect(T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit})).to.eventually.be.rejectedWith('T721C::registerCategories | duplicate currency');

    }
};
