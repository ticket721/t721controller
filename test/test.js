const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('./utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { T721C_CONTRACT_NAME } = require('./constants');

const { getGroupID } = require('../test_cases/getGroupID');
const { setScopeIndex } = require('../test_cases/setScopeIndex');
const { setFeeCollector } = require('../test_cases/setFeeCollector');
const { balanceOf } = require('../test_cases/balanceOf');
const { getTicketAffiliation } = require('../test_cases/getTicketAffiliation');
const { isCodeConsummable } = require('../test_cases/isCodeConsummable');

const { mint } = require('../test_cases/mint');

const {withdraw} = require('../test_cases/withdraw');

const {attach} = require('../test_cases/attach');

contract('T721Controller_v0', (accounts) => {

    before(async function() {
        const T721ControllerArtifact = artifacts.require(T721C_CONTRACT_NAME);
        const T721ControllerInstance = await T721ControllerArtifact.deployed();

        const ERC20MockArtifact = artifacts.require('ERC20Mock_v0');
        const DaiMockArtifact = artifacts.require('DaiMock_v0');
        const ERC721MockArtifact = artifacts.require('ERC721Mock_v0');

        const ERC20Instance = await ERC20MockArtifact.deployed();
        const DaiInstance = await DaiMockArtifact.deployed();
        const ERC721Instance = await ERC721MockArtifact.deployed();

        this.contracts = {
            [T721C_CONTRACT_NAME]: T721ControllerInstance,
            Dai: DaiInstance,
            ERC721: ERC721Instance,
            ERC20: ERC20Instance,
        };

        this.snap_id = await snapshot();
        this.accounts = accounts;
        this.expect = expect;
    });

    beforeEach(async function() {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    describe('Utils', function() {

        it('getGroupID', getGroupID);
        it('setScopeIndex', setScopeIndex);
        it('setFeeCollector', setFeeCollector);
        it('balanceOf', balanceOf);
        it('getTicketAffiliation', getTicketAffiliation);
        it('isCodeConsummable', isCodeConsummable);

    });

    describe('Mint', function() {

        it('should mint 5 tickets with 2 payments', mint);

    });

    describe('Attach', function() {

        it('should attach 5 beers and 2 fries', attach);

    });

    describe('Withdraw', function() {

        it('withdraw everything', withdraw);

    });


});
