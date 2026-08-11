const fs = require('fs');


const crypto = require('crypto');

const keyPath = 'I:/DIGIBIZ_MASTER/serviceAccountKey.json';
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

console.log('Testing token generation...');
console.log('Project:', key.project_id);
console.log('Client Email:', key.client_email);
console.log('Private Key ID:', key.private_key_id, '\n');

function b64url(b) {
  return Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const header = { alg: 'RS256', typ: 'JWT' };
const iat = Math.floor(Date.now() / 1000);
const claims = {
  iss: key.client_email,
  scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
  aud: 'https://oauth2.googleapis.com/token',
  iat: iat,
  exp: iat + 3600
};
console.log('JWT Claims:', JSON.stringify(claims, null, 2));

const input = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claims));

try {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(input);
  const signature = sign.sign(key.private_key, 'base64');
  const b64sig = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const jwt = input + '.' + b64sig;
  console.log('\nJWT created successfully!');
  console.log('JWT Length:', jwt.length, 'chars\n');

  console.log('Exchanging JWT for access token...');
  const params = new URLSearchParams();
  params.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.set('assertion', jwt);

  fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  .then(res => {
    console.log('HTTP Status:', res.status);
    return res.text();
  })
  .then(txt => {
    console.log('Response:');
    try {
      const json = JSON.parse(txt);
      console.log(JSON.stringify(json, null, 2));
      if (json.access_token) {
        console.log('\nTOKEN SUCCESS!');
        console.log('Access Token (first 50):', json.access_token.substring(0, 50) + '...');
        console.log('Expires in:', json.expires_in, 'seconds');
        testFirestore(json.access_token);
      } else if (json.error) {
        console.log('ERROR:', json.error);
        console.log('Description:', json.error_description);
      }
    } catch (e) {
      console.log('Raw response:', txt);
    }
  })
  .catch(err => console.error('Fetch error:', err));
} catch (err) {
  console.error('Signing error:', err.message);
  console.error(err);
}

async function testFirestore(accessToken) {
  try {
    const projectId = key.project_id;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    console.log('\nTesting Firestore, URL:', url);
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } });
    console.log('Firestore HTTP:', response.status);
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.documents) {
        console.log('Found', json.documents.length, 'documents');
        json.documents.forEach(doc => console.log('  ', doc.name.split('/').pop()));
      } else {
        console.log('Response:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', text);
    }
  } catch (err) {
    console.error('Firestore test error:', err.message);
  }
}
