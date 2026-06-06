const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function run() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login/student', {
      email: 'aluno.ladv@demo.com',
      password: 'demo123456'
    });
    const token = loginRes.data.data.access_token;
    console.log('Login success');

    // 2. Create valid dummy PDF (so it passes pdfParse and LADV OCR!)
    // Wait, pdfParse will try to parse text. It needs LADV text!
    // I will use testMode instead of sending a real LADV!
    console.log('Sending manual LADV request 1...');
    await axios.post('http://localhost:3001/api/v1/ladv/me/manual', {
      ladvNumber: '123456',
      ladvIssuedAt: new Date().toISOString(),
      ladvValidUntil: new Date(Date.now() + 864000000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Manual LADV 1 success!');

    // Wait, the user said "ao tentar enviar a LADV" (upload LADV).
    // Let me try the test mode upload!
    console.log('Sending upload LADV request in TEST MODE (which simulates LADV upload)...');
    const form = new FormData();
    fs.writeFileSync('dummy.pdf', '%PDF-1.4 dummy');
    form.append('file', fs.createReadStream('dummy.pdf'));

    const uploadRes = await axios.post('http://localhost:3001/api/v1/ladv/me/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
        'x-test-mode': 'true' // ENABLE TEST MODE TO AVOID OCR PARSING CRASH
      }
    });

    console.log('Upload LADV success!', uploadRes.data);
    
    console.log('Sending upload LADV AGAIN in TEST MODE...');
    const form2 = new FormData();
    form2.append('file', fs.createReadStream('dummy.pdf'));
    const uploadRes2 = await axios.post('http://localhost:3001/api/v1/ladv/me/upload', form2, {
      headers: {
        ...form2.getHeaders(),
        Authorization: `Bearer ${token}`,
        'x-test-mode': 'true'
      }
    });
    console.log('Upload LADV 2 success!', uploadRes2.data);
    
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
  } finally {
    if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
  }
}

run();
