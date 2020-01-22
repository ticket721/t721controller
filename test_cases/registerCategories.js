const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32 } = require('./utils');

module.exports = {
    registerCategories: async function registerCategories() {

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
                    [ERC20.address]: 100
                }
            })
        }

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        const receipt = await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});
        expect(receipt.logs.length).to.equal(amount);

        for (let idx = 0; idx < amount; ++idx) {
            expect(receipt.logs[idx].args.group_id).to.equal(id);
            expect(receipt.logs[idx].args.category_name).to.equal(strToB32(`regular_${idx}`));
            expect(receipt.logs[idx].args.idx.toNumber()).to.equal(idx);

            const recovered = await T721Controller.getCategory(id, idx);

            expect(recovered.amount.toNumber()).to.equal(100);
            expect(recovered.sale_start.toNumber()).to.equal(sale_start + idx);
            expect(recovered.sale_end.toNumber()).to.equal(sale_end + idx);
            expect(recovered.resale_start.toNumber()).to.equal(resale_start + idx);
            expect(recovered.resale_end.toNumber()).to.equal(resale_end + idx);
            expect(recovered.authorization).to.equal(ZADDRESS);
            expect(recovered.name).to.equal(strToB32(`regular_${idx}`));
            expect(recovered.hierarchy).to.equal(strToB32('root'));
            expect(recovered.sold.toNumber()).to.equal(0);

            expect(recovered.currencies.length).to.equal(1);
            expect(recovered.currencies.indexOf(ERC20.address)).to.not.equal(-1);

            expect((await T721Controller.getCategoryPrice(id, idx, ERC20.address)).toNumber()).to.equal(100);

        }

    }
};
