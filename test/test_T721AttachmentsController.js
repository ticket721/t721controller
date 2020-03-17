const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME }  = require('../test_cases/constants');

const {useless_unwhitelisting} = require('../test_cases/useless_unwhitelisting');
const {setFeeCollector_from_non_owner} = require('../test_cases/setFeeCollector_from_non_owner');

const {fixAttachments_without_authorization} = require('../test_cases/fixAttachments_without_authorization');
const {fixAttachments_with_authorization} = require('../test_cases/fixAttachments_with_authorization');
const {fixAttachments_invalid_ticket_id} = require('../test_cases/fixAttachments_invalid_ticket_id');
const {fixAttachments_invalid_group_id} = require('../test_cases/fixAttachments_invalid_group_id');
const {fixAttachments_invalid_category_idx} = require('../test_cases/fixAttachments_invalid_category_idx');
const {fixAttachments_invalid_b32_length} = require('../test_cases/fixAttachments_invalid_b32_length');
const {fixAttachments_invalid_caller} = require('../test_cases/fixAttachments_invalid_caller');
const {fixAttachments_invalid_nums_length} = require('../test_cases/fixAttachments_invalid_nums_length');
const {fixAttachments_invalid_nums_length_without_authorization} = require('../test_cases/fixAttachments_invalid_nums_length_without_authorization');
const {fixAttachments_invalid_auth_sig_length} = require('../test_cases/fixAttachments_invalid_auth_sig_length');
const {fixAttachments_invalid_signature} = require('../test_cases/fixAttachments_invalid_signature');
const {fixAttachments_invalid_code} = require('../test_cases/fixAttachments_invalid_code');
const {fixAttachments_duplicate_code} = require('../test_cases/fixAttachments_duplicate_code');
const {fixAttachments_erc20_invalid_nums_length} = require('../test_cases/fixAttachments_erc20_invalid_nums_length');
const {fixAttachments_erc20_invalid_addr_length} = require('../test_cases/fixAttachments_erc20_invalid_addr_length');
const {fixAttachments_erc20_allowance_too_low} = require('../test_cases/fixAttachments_erc20_allowance_too_low');

contract('T721AttachmentsController_v0', (accounts) => {

    before(async function () {
        const T721ControllerArtifact = artifacts.require(T721C_CONTRACT_NAME);
        const T721ControllerInstance = await T721ControllerArtifact.deployed();

        const T721AttachmentsControllerArtifact = artifacts.require(T721AC_CONTRACT_NAME);
        const T721AttachmentsControllerInstance = await T721AttachmentsControllerArtifact.deployed();

        const ERC20MockArtifact = artifacts.require('ERC20Mock_v0');
        const DaiMockArtifact = artifacts.require('DaiMock_v0');
        const ERC721MockArtifact = artifacts.require('ERC721Mock_v0');

        const ERC20Instance = await ERC20MockArtifact.deployed();
        const DaiInstance = await DaiMockArtifact.deployed();
        const ERC721Instance = await ERC721MockArtifact.deployed();

        //await ERC721Instance.createScope(SCOPE_NAME, '0x0000000000000000000000000000000000000000', [MetaMarketplaceInstance.address], []);
        //const scope = await ERC721Instance.getScope(SCOPE_NAME);
        //setScopeIndex(scope.scope_index.toNumber());

        this.contracts = {
            [T721C_CONTRACT_NAME]: T721ControllerInstance,
            [T721AC_CONTRACT_NAME]: T721AttachmentsControllerInstance,
            ERC721: ERC721Instance,
            ERC20: ERC20Instance,
            Dai: DaiInstance
        };

        this.snap_id = await snapshot();
        this.accounts = accounts;
        this.expect = expect;
    });

    beforeEach(async function () {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    // describe('Attachments', function () {

    //     it('fixAttachments with authorization', fixAttachments_with_authorization);
    //     it('fixAttachments without authorization', fixAttachments_without_authorization);
    //     it('fixAttachments invalid ticket id', fixAttachments_invalid_ticket_id);
    //     it('fixAttachments invalid group id', fixAttachments_invalid_group_id);
    //     it('fixAttachments invalid category idx', fixAttachments_invalid_category_idx);
    //     it('fixAttachments invalid b32 length', fixAttachments_invalid_b32_length);
    //     it('fixAttachments invalid caller', fixAttachments_invalid_caller);
    //     it('fixAttachments invalid nums length', fixAttachments_invalid_nums_length);
    //     it('fixAttachments invalid nums length without authorization', fixAttachments_invalid_nums_length_without_authorization);
    //     it('fixAttachments invalid auth sig length', fixAttachments_invalid_auth_sig_length);
    //     it('fixAttachments invalid signature', fixAttachments_invalid_signature);
    //     it('fixAttachments invalid code', fixAttachments_invalid_code);
    //     it('fixAttachments duplicate code', fixAttachments_duplicate_code);
    //     it('fixAttachments erc20 invalid nums length', fixAttachments_erc20_invalid_nums_length);
    //     it('fixAttachments erc20 invalid addr length', fixAttachments_erc20_invalid_addr_length);
    //     it('fixAttachments erc20 allowance too low', fixAttachments_erc20_allowance_too_low);

    // });

    // describe('Utils', function () {

    //     it('setFeeCollector from non owner', setFeeCollector_from_non_owner);
    //     it('useless unwhitelisting', useless_unwhitelisting);

    // });


});
