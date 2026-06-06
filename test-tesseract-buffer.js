const { recognize } = require('tesseract.js');
const fs = require('fs');

async function run() {
  fs.writeFileSync('fake.jpg', 'THIS IS NOT AN IMAGE');
  const buffer = fs.readFileSync('fake.jpg');
  try {
    console.log('Testing recognize with buffer...');
    await recognize(buffer, 'por');
    console.log('success');
  } catch (err) {
    console.error('caught error:', err.message);
  }
}
run();
