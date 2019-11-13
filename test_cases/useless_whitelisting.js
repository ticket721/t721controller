const { CONTRACT_NAME } = require('./constants');

module.exports = {
    useless_whitelisting: async function useless_whitelisting() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[CONTRACT_NAME];
        const {ERC20, ERC2280} = this.contracts;

        await expect(T721Controller.whitelistERC20(ERC20.address, true)).to.eventually.be.rejectedWith('T721C::whitelistERC20 | useless transaction');
        await expect(T721Controller.whitelistERC2280(ERC2280.address, true)).to.eventually.be.rejectedWith('T721C::whitelistERC2280 | useless transaction');

    }
};
