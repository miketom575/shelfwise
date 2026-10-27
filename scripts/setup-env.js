// Creates backend/.env (with a fresh random JWT secret) and database/.env from their templates, if missing.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensure(folder, transform = (t) => t) {
  const dir = path.join(__dirname, '..', folder);
  const target = path.join(dir, '.env');
  if (fs.existsSync(target)) return console.log(`${folder}/.env already exists, leaving it alone.`);
  fs.writeFileSync(target, transform(fs.readFileSync(path.join(dir, '.env.example'), 'utf8')));
  console.log(`Created ${folder}/.env`);
}

ensure('backend', (t) => t.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`));
ensure('database');
console.log('\nNext: make sure MongoDB is running, then  npm run seed  and  npm run dev');
