const { T721C_CONTRACT_NAME, ZADDRESS } = require('./constants');
const { catToArgs, strToB32 } = require('./utils');

module.exports = {
    groupDeterministicId: async function groupDeterministicId() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC20, ERC2280} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const first_expected_id = await T721Controller.getNextGroupId();
        const first_res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const first_id = first_res.logs[0].args.id;

        expect(first_expected_id).to.equal(first_id);

        const second_expected_id = await T721Controller.getNextGroupId();
        const second_res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const second_id = second_res.logs[0].args.id;

        expect(second_expected_id).to.equal(second_id);
        expect(first_expected_id).to.not.equal(second_expected_id);

    }
};
