const { CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32, catToEditArgs } = require('./utils');

module.exports = {
    editCategory_invalid_currency: async function editCategory_invalid_currency() {

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
                [ERC20.address]: 100
            }
        });

        const [nums, addr, byte_data] = catToArgs(categories);
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        await T721Controller.registerCategories(id, nums, addr, byte_data, {gas: gasLimit});
        let recovered = await T721Controller.getCategory(id, 0);

        expect(recovered.amount.toNumber()).to.equal(100);
        expect(recovered.sale_start.toNumber()).to.equal(sale_start);
        expect(recovered.sale_end.toNumber()).to.equal(sale_end);
        expect(recovered.resale_start.toNumber()).to.equal(resale_start);
        expect(recovered.resale_end.toNumber()).to.equal(resale_end);
        expect(recovered.authorization).to.equal(ZADDRESS);
        expect(recovered.name).to.equal(strToB32(`regular`));
        expect(recovered.hierarchy).to.equal(strToB32('root'));
        expect(recovered.sold.toNumber()).to.equal(0);

        expect(recovered.currencies.length).to.equal(1);
        expect(recovered.currencies.indexOf(ERC20.address)).to.not.equal(-1);

        expect((await T721Controller.getCategoryPrice(id, 0, ERC20.address)).toNumber()).to.equal(100);

        categories[0] = {
            hierarchy: 'toor',
            amount: 200,
            sale_start: sale_start,
            sale_end: sale_end + 100,
            resale_start: resale_start + 100,
            resale_end: resale_end + 100,
            authorization: accounts[1],
            prices: {
                [ERC20.address]: 200,
                [accounts[0]]: 100
            }
        };

        const [edit_nums, auth, hierarchy, prices, currencies] = catToEditArgs(categories[0]);

        return expect(T721Controller.editCategory(id, 0, edit_nums, auth, hierarchy, prices, currencies)).to.be.rejectedWith('T721C::editCategory | unauthorized currency');
    }
};
