pragma solidity 0.5.15;
import "./SigUtil_v0.sol";

contract T721AttachmentsControllerDomain_v0 {

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

    struct Attachment {
        bytes32 group;
        uint256 category;
        bytes32 attachment;
        uint256 amount;
        bytes prices;
        bytes currencies;
        uint256 code;
    }

    bytes32 constant ATTACHMENT_TYPEHASH = keccak256(
    // solhint-disable-next-line max-line-length
        "Attachment(bytes32 group,uint256 category,bytes32 attachment,uint256 amount,bytes prices,bytes currencies,uint256 code)"
    );

    function hash(Attachment memory att) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                ATTACHMENT_TYPEHASH,
                att.group,
                att.category,
                att.attachment,
                att.amount,
                keccak256(att.prices),
                keccak256(att.currencies),
                att.code
            ));
    }

    function verify(Attachment memory att, bytes memory raw_signature) internal view returns (address) {
        SigUtil_v0.Signature memory signature = SigUtil_v0._splitSignature(raw_signature);
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(att)
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
