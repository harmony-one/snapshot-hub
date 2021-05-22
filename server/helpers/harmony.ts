import { HarmonyAddress } from '@harmony-js/crypto';

const BigNumber = require('bignumber.js');
const request = require('request');

export function getStakedAmountByBlock(req, res) {
  const rpcUrl = ['mainnet', '1', '1666600000'].indexOf(req.query.network) > -1
    ? 'https://api.s0.t.hmny.io/' : 'https://api.s0.b.hmny.io/';
  const addressesRaw = req.query.addresses.split(',');
  let addressSet: any[] = [];

  // trans address
  for (const index in addressesRaw) {
    addressSet.push(new HarmonyAddress(addressesRaw[index]).bech32);
  }

  let payload = {
    "jsonrpc": "2.0",
    "method": "hmy_getDelegationsByDelegatorByBlockNumber",
    "params":[
      addressSet,
      req.query.snapshot
    ],
    "id": 1
  };

  request({
    url: rpcUrl,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload)
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      const resObj = JSON.parse(body);
      if (resObj.error) {
        return res.status(500).json({
          error: 'harmony_api_error',
          error_description: resObj.error
        });
      } else {
        let scores: any[] = [];
        if (resObj.result.length > 0) {
          let stakedSet = new Map();
          for (const addressIndex in resObj.result) {
            const delegatorDelegations = resObj.result[addressIndex];
            for (const delegationIndex in delegatorDelegations) {
              const delegation = delegatorDelegations[delegationIndex];
              const delegator = new HarmonyAddress(delegation.delegator_address).checksum;
              if (stakedSet.has(delegator)) {
                const staked = stakedSet.get(delegator);
                stakedSet.set(delegator, staked.plus(delegation.amount));
              } else {
                stakedSet.set(delegator, new BigNumber(delegation.amount));
              }
            }
          }
          console.log(stakedSet);
          for (const address of stakedSet.keys()) {
            scores.push({
              address: address,
              score: stakedSet.get(address).toFixed()
            })
          }
        }

        return res.json({
          error: '',
          score: scores
        });
      }
    } else {
      return res.status(500).json({
        error: 'harmony_api_error',
        error_description: error
      });
    }
  });
}
