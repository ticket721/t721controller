pragma solidity >=0.4.25 <0.6.0;
import "./SigUtil_v0.sol";

contract T721ControllerDomain_v0 {

    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    function hash(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256(bytes(eip712Domain.name)),
                keccak256(bytes(eip712Domain.version)),
                eip712Domain.chainId,
                eip712Domain.verifyingContract
            ));
    }

    bytes32 DOMAIN_SEPARATOR;

    struct MintingAuthorization {
        uint256 code;
        address emitter;
        address minter;
        bytes32 group;
        bytes32 category;
    }

    bytes32 constant MINTINGAUTHORIZATION_TYPEHASH = keccak256(
        "MintingAuthorization(uint256 code,address emitter,address minter,bytes32 group,bytes32 category)"
    );

    function hash(MintingAuthorization memory mauth) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                MINTINGAUTHORIZATION_TYPEHASH,
                mauth.code,
                mauth.emitter,
                mauth.minter,
                mauth.group,
                mauth.category
            ));
    }

    function verify(MintingAuthorization memory mauth, bytes memory raw_signature) internal view returns (address) {
        SigUtil_v0.Signature memory signature = SigUtil_v0._splitSignature(raw_signature);
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(mauth)
            ));

        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    constructor(string memory _domain_name, string memory _version, uint256 _chainId) internal {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: _domain_name,
            version: _version,
            chainId: _chainId,
            verifyingContract: address(this)
            }));
    }


}
