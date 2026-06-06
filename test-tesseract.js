const { createWorker, recognize } = require('tesseract.js');
const fs = require('fs');

async function run() {
  fs.writeFileSync('fake.jpg', 'THIS IS NOT AN IMAGE');
  try {
    console.log('Testing recognize...');
    await recognize('fake.jpg', 'por');
    console.log('recognize success');
  } catch (err) {
    console.error('recognize caught error:', err.message);
  }

  try {
    console.log('Testing createWorker...');
    const worker = await createWorker('por');
    const res = await worker.recognize('fake.jpg');
    console.log('worker success');
    await worker.terminate();
  } catch (err) {
    console.error('worker caught error:', err.message);
  }
}
run();
