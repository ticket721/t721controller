const { T721C_CONTRACT_NAME } = require('./constants');
const {Wallet} = require('ethers');

module.exports = {
    getGroupID: async function getGroupID() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const {ERC721, ERC20, Dai} = this.contracts;
        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
        const authorizer = Wallet.createRandom();

        const uuid = 'c4758045-fe85-4935-8e2e-fab04966907d'.toLowerCase();

        const groupId = await T721Controller.getGroupID(accounts[0], uuid);

        expect(groupId).to.equal('0xb044a845776cca7200acadc699ca037ff734b7f39b522534391a935f8eb2a09c');
    }
};
