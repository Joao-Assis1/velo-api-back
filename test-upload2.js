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
    console.log('Login success, token:', token.substring(0, 20) + '...');

    // 2. Create dummy file
    fs.writeFileSync('dummy.jpg', 'FAKE IMAGE DATA');

    // 3. Upload
    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.jpg'));

    const uploadRes = await axios.post('http://localhost:3001/api/v1/ladv/me/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Upload success:', uploadRes.data);
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
  } finally {
    if (fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
  }
}

run();
