import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import http from 'http';

const SUBJECT_SECRET = 'SBVAB3HZH3XL5XARTSRQ3GUCEGIQL43CXXHPDM3TKA47LYOI64YEOQ7D';
const SUBJECT_PUB   = 'GAUW7VXED5YFOHX2HNEVR4ZHUIU6OMU3HE6NJ7HCRB3ADUKJ5H3QASA2';
const ISSUER_SECRET = 'SDHAHLWOFUUYKLFLUGCBYDLNILHPWHBHUWGLOFWTB5EZ4ENWOXTXS73E';
const ISSUER_PUB    = 'GDFIG4YYAMBOKJ2RGXGYXGZKEOGLBOB5GP6RURA6MPNNH2BPF27S2UQV';

function req(method, path, body, token) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host:'localhost', port:3002, path, method,
      headers: { 'Content-Type':'application/json',
        ...(data ? {'Content-Length': Buffer.byteLength(data)} : {}),
        ...(token ? {'Authorization':'Bearer '+token} : {}) }
    }, resp => { let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{ try{res(JSON.parse(d))}catch{res(d)} }); });
    r.on('error',rej); if(data) r.write(data); r.end();
  });
}

async function login(pub, secret) {
  const kp = Keypair.fromSecret(secret);
  const ch = await req('GET', '/api/v1/auth/challenge?publicKey='+pub);
  const tx = new Transaction(ch.transaction, Networks.TESTNET);
  tx.sign(kp);
  const res = await req('POST', '/api/v1/auth/login', { signedTransaction: tx.toXDR() });
  return res.accessToken;
}

(async () => {
  // 1. Login as subject
  console.log('[1] Login as subject...');
  const subjectToken = await login(SUBJECT_PUB, SUBJECT_SECRET);
  console.log('    ✓ Token:', subjectToken ? 'OK' : 'FAILED');

  // 2. Create DID
  console.log('[2] Create DID...');
  const did = await req('POST', '/api/v1/did/create', {}, subjectToken);
  console.log('    ✓', did.did ?? did.message ?? JSON.stringify(did).slice(0,80));

  // 3. Issue credential (triggers is_issuer on-chain check)
  console.log('[3] Issue KYC credential...');
  const vc = await req('POST', '/api/v1/credentials/issue', { country:'NG', age:25, accredited:false }, subjectToken);
  const credId = vc.id?.replace('urn:uuid:','');
  console.log('    ✓ Credential:', credId ?? JSON.stringify(vc).slice(0,100));
  console.log('    onChainTxHash:', vc.onChainTxHash ?? 'null (no credential-registry contract deployed)');

  // 4. View credentials
  console.log('[4] View credentials...');
  const creds = await req('GET', '/api/v1/credentials', null, subjectToken);
  console.log('    ✓ Total credentials in DB:', Array.isArray(creds) ? creds.length : 'error');
  if (Array.isArray(creds)) {
    creds.forEach(c => console.log('      -', c.id, '|', c.status, '| hash:', c.credentialHash?.slice(0,16)+'...'));
  }

  if (!credId) { console.log('No credential ID, stopping'); return; }

  // 5. Login as issuer
  console.log('[5] Login as issuer...');
  const issuerToken = await login(ISSUER_PUB, ISSUER_SECRET);
  console.log('    ✓ Token:', issuerToken ? 'OK' : 'FAILED');

  // 6. Revoke (triggers revoke_credential on-chain)
  console.log('[6] Revoke credential on-chain...');
  const revoke = await req('POST', '/api/v1/credentials/'+credId+'/revoke', {}, issuerToken);
  console.log('    ✓ Status:', revoke.status ?? JSON.stringify(revoke).slice(0,100));

  // 7. Verify revocation (triggers is_revoked on-chain check)
  console.log('[7] Verify revoked (is_revoked on-chain check)...');
  const issuerCreds = await req('GET', '/api/v1/credentials/issued', null, issuerToken);
  const revokedCred = Array.isArray(issuerCreds) && issuerCreds.find(c => c.id === credId);
  console.log('    ✓ Credential status in DB:', revokedCred?.status ?? 'not found');

  console.log('\n=== CHECK ON-CHAIN ===');
  console.log('Revocation registry:');
  console.log('https://stellar.expert/explorer/testnet/contract/CBV6NUS4XGRIOLWK37VG4SBP7OR4FLW3H4NTZGPNC4DPYZVNMJ37KSDF');
})().catch(console.error);
