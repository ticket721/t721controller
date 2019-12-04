const { T721C_CONTRACT_NAME } = require('./constants');

module.exports = {
    addAdmin: async function addAdmin() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        const receipt = await T721Controller.addAdmin(id, accounts[2], {from: accounts[0]});

        expect(receipt.logs[0].event).to.equal('GroupAdminAdded');
        expect(receipt.logs[0].args.id).to.equal(id);
        expect(receipt.logs[0].args.admin).to.equal(accounts[2]);

        return expect(T721Controller.isAdmin(id, accounts[2])).to.eventually.equal(true);

    }
};
