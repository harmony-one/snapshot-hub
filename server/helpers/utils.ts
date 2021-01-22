import snapshot from '@snapshot-labs/snapshot.js';
import { verifyMessage } from '@ethersproject/wallet';
import { convertUtf8ToHex } from '@walletconnect/utils';
import * as ethUtil from 'ethereumjs-util';
import { isValidSignature } from './eip1271';

import { Harmony } from '@harmony-js/core';
import { HarmonyAddress } from '@harmony-js/crypto';
import { ChainType, ChainID } from '@harmony-js/utils';
import { bufferToHex } from 'ethereumjs-util';
import {
  keccak256,
  recoverPublicKey as hmyRecoverPublicKey,
  getAddressFromPublicKey
} from '@harmony-js/crypto';

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export async function verify(address, msg, sig) {
  const recovered = await verifyMessage(msg, sig);
  return recovered === address;
}

export function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

export function sendError(res, description) {
  return res.status(500).json({
    error: 'unauthorized',
    error_description: description
  });
}

export async function recoverPublicKey(
  sig: string,
  hash: string
): Promise<string> {
  console.log('hash: ', hash);
  console.log('sig: ', sig);

  const publicKey = await hmyRecoverPublicKey(hash, sig);

  const address = getAddressFromPublicKey(publicKey);

  console.log('addresss: ', address);

  return address;

  // const params = ethUtil.fromRpcSig(sig);
  //
  // console.log(111, hash);
  //
  // const result = ethUtil.ecrecover(
  //   ethUtil.toBuffer(hash),
  //   params.v,
  //   params.r,
  //   params.s
  // );
  // return ethUtil.bufferToHex(ethUtil.publicToAddress(result));
}

export async function verifySignature(
  address: string,
  sig: string,
  hash: string
  // chainId: number
): Promise<boolean> {
  const provider = snapshot.utils.getProvider('1');
  const bytecode = await provider.getCode(address);
  if (
    !bytecode ||
    bytecode === '0x' ||
    bytecode === '0x0' ||
    bytecode === '0x00'
  ) {
    const signer = await recoverPublicKey(sig, hash);

    console.log(1111, signer.toLowerCase(), address.toLowerCase());

    return signer.toLowerCase() === address.toLowerCase();
  } else {
    console.log('Smart contract signature');
    return isValidSignature(address, sig, hash, provider);
  }
}

export function encodePersonalMessage(msg: string): string {
  const data = ethUtil.toBuffer(convertUtf8ToHex(msg));
  const buf = Buffer.concat([
    Buffer.from(
      '\u0019Ethereum Signed Message:\n' + data.length.toString(),
      'utf8'
    ),
    data
  ]);
  return ethUtil.bufferToHex(buf);
}

export const hashPersonalMessage = (msg: string, address: string): string => {
  // const data = encodePersonalMessage(msg);
  // const buf = ethUtil.toBuffer(data);
  // const hash = ethUtil.keccak256(buf);
  // const hex = ethUtil.bufferToHex(hash);
  //
  // return hex;

  const harmony = new Harmony('https://api.s0.t.hmny.io', {
    chainType: ChainType.Harmony,
    chainId: ChainID.HmyMainnet
  });

  const transaction = harmony.transactions.newTx({
    from: new HarmonyAddress(address).checksum,
    // to: new HarmonyAddress(address).checksum,
    value: 0,
    shardID: 0,
    toShardID: 0,
    gasLimit: 0,
    gasPrice: 0,
    data: bufferToHex(new Buffer(msg, 'utf8'))
  });

  const [unsignedRawTransaction, raw] = transaction.getRLPUnsigned();

  return keccak256(unsignedRawTransaction);
};

export async function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export function formatMessage(message) {
  const metadata = JSON.parse(message.metadata);
  return [
    message.id,
    {
      address: message.address,
      msg: {
        version: message.version,
        timestamp: message.timestamp.toString(),
        space: message.space,
        type: message.type,
        payload: JSON.parse(message.payload)
      },
      sig: message.sig,
      authorIpfsHash: message.id,
      relayerIpfsHash: metadata.relayer_ipfs_hash
    }
  ];
}
