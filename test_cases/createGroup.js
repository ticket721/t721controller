const { T721C_CONTRACT_NAME } = require('./constants');
const hex = require('string-hex');

module.exports = {
    createGroup: async function createGroup() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        expect(res.logs[0].args.owner).to.equal(accounts[0]);
        expect(res.logs[0].args.controllers).to.equal(controllers);

        const id = res.logs[0].args.id;

        const group_data = await T721Controller.groups(id);

        expect(group_data.owner).to.equal(accounts[0]);
        expect(group_data.controllers).to.equal(controllers);

    }
}
