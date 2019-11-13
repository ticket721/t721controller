const { CONTRACT_NAME } = require('./constants');

module.exports = {
    removeAdmin: async function removeAdmin() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        await T721Controller.addAdmin(id, accounts[2], {from: accounts[0]});
        await expect(T721Controller.isAdmin(id, accounts[2])).to.eventually.equal(true);
        const receipt = await T721Controller.removeAdmin(id, accounts[2], {from: accounts[0]});

        expect(receipt.logs[0].event).to.equal('GroupAdminRemoved');
        expect(receipt.logs[0].args.id).to.equal(id);
        expect(receipt.logs[0].args.admin).to.equal(accounts[2]);


    }
};
