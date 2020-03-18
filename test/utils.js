const { BigNumber } = require('ethers/utils');

const ethers = require('ethers');
const strhex = require('string-hex');
const {EIP712Signer} = require('@ticket721/e712');

const snapshot = () => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_snapshot',
            params: [],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const revert = (snap_id) => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_revert',
            params: [snap_id],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const ZERO = '0x0000000000000000000000000000000000000000';
const ZEROSIG = `0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`

const strToB32 = (str) => {
    let hex = strhex(str);
    if (hex.length % 2) {
        hex = `0${hex}`;
    }

    const pad = 64 - hex.length;

    return `0x${hex}${"0".repeat(pad)}`;
};

const Authorization = [
    {
        name: 'emitter',
        type: 'address'
    },
    {
        name: 'grantee',
        type: 'address'
    },
    {
        name: 'hash',
        type: 'bytes32'
    }
];

class Authorizer extends EIP712Signer {
    constructor(chain_id, address) {
        super({
                name: 'T721 Controller',
                version: '0',
                chainId: chain_id,
                verifyingContract: address
            },
            ['Authorization', Authorization]
        );
    }
}

const encodeAndHash  = (types, args) => {
    return web3.utils.keccak256(Buffer.from(web3.eth.abi.encodeParameters(types, args).slice(2), 'hex'));
};

const encodedU256 = (num) => {
    return web3.eth.abi.encodeParameters(['uint256'], [num]).slice(2);
};

const encodeAddress = (address) => {
    return web3.eth.abi.encodeParameters(['address'], [address]).slice(2);
};

const generateMintPayload = async (uuid, payments, tickets, eventController, signer) => {

    const groupId = encodeAndHash(['address', 'string'], [eventController.address, uuid]);

    const b32 = [];
    const addr = [];
    const uints = [];
    let bs = '0x';

    let prices = '';

    uints.push(payments.length);
    addr.push(eventController.address);

    for (const payment of payments) {
        // Add Price
        uints.push(payment.amount);
        prices = `${prices}${encodedU256(payment.amount)}`;
        uints.push(payment.fee);
        prices = `${prices}${encodedU256(payment.fee)}`;
        addr.push(payment.currency);
        prices = `${prices}${encodeAddress(payment.currency)}`;
    }

    uints.push(tickets.length);

    for (const ticket of tickets) {

        uints.push(ticket.code);
        addr.push(ticket.owner);
        b32.push(strToB32(ticket.category));

        const hash = encodeAndHash(['string', 'bytes', 'bytes32', 'bytes32', 'uint256'], ['mint', `0x${prices}`, groupId, strToB32(ticket.category), ticket.code]);

        const authorization = {
            emitter: eventController.address,
            grantee: ticket.owner,
            hash,
        };

        const payload = signer.generatePayload(authorization, 'Authorization');
        const signature = await signer.sign(eventController.privateKey, payload);

        bs = `${bs}${signature.hex.slice(2)}`;

    }

    return [uuid, b32, uints, addr, bs];

};

const getGroupID = (address, id) => {
    return web3.utils.keccak256(web3.eth.abi.encodeParameters(['address', 'string'], [address, id]));
}

module.exports = {
    ZERO,
    ZEROSIG,
    revert,
    snapshot,
    strToB32,
    encodeAndHash,
    Authorizer,
    encodedU256,
    encodeAddress,
    generateMintPayload,
    getGroupID,
};
