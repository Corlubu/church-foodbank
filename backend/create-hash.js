// backend/create-hash.js
const bcrypt = require('bcrypt');
const password = 'staff@2025'; // 👈 CHANGE THIS TO A STRONG PASSWORD!
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log('Copy this hash:');
  console.log(hash);
  console.log('\nRun this SQL:');
  console.log(`INSERT INTO users (username, password_hash, role) VALUES ('staff', '${hash}', 'staff');`);
});