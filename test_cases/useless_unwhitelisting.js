const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME } = require('./constants');

module.exports = {
    useless_unwhitelisting: async function useless_unwhitelisting() {

        const {accounts, expect} = this;
        const {ERC20, Dai} = this.contracts;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
        const T721AttachmentsController = this.contracts[T721AC_CONTRACT_NAME];

        await expect(T721Controller.removeCurrency(accounts[0])).to.eventually.be.rejectedWith('T721C::removeCurrency | useless transaction');
        await expect(T721Controller.removeCurrency(accounts[0])).to.eventually.be.rejectedWith('T721C::removeCurrency | useless transaction');

        await T721Controller.whitelistCurrency(ERC20.address, 10, 0);
        await T721Controller.whitelistCurrency(Dai.address, 10, 0);

        expect((await T721Controller.getFee(ERC20.address, 100)).toNumber()).to.equal(10);
        expect((await T721Controller.getFee(Dai.address, 100)).toNumber()).to.equal(10);

        await expect(T721Controller.getFee(ERC20.address, 9)).to.eventually.be.rejectedWith('T721C::getFee | paid amount is under fixed fee');
        await expect(T721Controller.getFee(Dai.address, 9)).to.eventually.be.rejectedWith('T721C::getFee | paid amount is under fixed fee');

        await T721Controller.removeCurrency(ERC20.address);
        await T721Controller.removeCurrency(Dai.address);
        
        await expect(T721AttachmentsController.removeCurrency(accounts[0])).to.eventually.be.rejectedWith('T721AC::removeCurrency | useless transaction');
        await expect(T721AttachmentsController.removeCurrency(accounts[0])).to.eventually.be.rejectedWith('T721AC::removeCurrency | useless transaction');

        await T721AttachmentsController.whitelistCurrency(ERC20.address, 10, 10);
        await T721AttachmentsController.whitelistCurrency(Dai.address, 10, 10);

        expect((await T721AttachmentsController.getFee(ERC20.address, 100)).toNumber()).to.equal(11);
        expect((await T721AttachmentsController.getFee(Dai.address, 100)).toNumber()).to.equal(11);

        await T721AttachmentsController.whitelistCurrency(ERC20.address, 10, 0);
        await T721AttachmentsController.whitelistCurrency(Dai.address, 10, 0);

        expect((await T721AttachmentsController.getFee(ERC20.address, 100)).toNumber()).to.equal(10);
        expect((await T721AttachmentsController.getFee(Dai.address, 100)).toNumber()).to.equal(10);

        await expect(T721AttachmentsController.getFee(ERC20.address, 9)).to.eventually.be.rejectedWith('T721AC::getFee | paid amount is under fixed fee');
        await expect(T721AttachmentsController.getFee(Dai.address, 9)).to.eventually.be.rejectedWith('T721AC::getFee | paid amount is under fixed fee');

        await T721AttachmentsController.removeCurrency(ERC20.address);
        await T721AttachmentsController.removeCurrency(Dai.address);

    }
};
