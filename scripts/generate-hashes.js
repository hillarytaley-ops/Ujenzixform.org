import crypto from 'crypto';

// Generate secure random staff code
function generateStaffCode() {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `UJPRO-${year}-${random}`;
}

// Generate SHA-256 hash (same as browser implementation)
function hashCode(code) {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

// Generate for both admins
const code1 = generateStaffCode();
const hash1 = hashCode(code1);
const code2 = generateStaffCode();
const hash2 = hashCode(code2);

console.log('');
console.log('================================================================================');
console.log('🔐 SECURE ADMIN CREDENTIALS GENERATED');
console.log('================================================================================');
console.log('');
console.log('⚠️  IMPORTANT: Save these staff codes securely! They cannot be recovered.');
console.log('    Share each code ONLY with the respective admin via secure channel.');
console.log('');
console.log('--------------------------------------------------------------------------------');
console.log('Admin 1: Florah Cherotich');
console.log('Email:      florahcherotich@gmail.com');
console.log('Staff Code: ' + code1);
console.log('Hash:       ' + hash1);
console.log('--------------------------------------------------------------------------------');
console.log('');
console.log('--------------------------------------------------------------------------------');
console.log('Admin 2: Hillary Taley');
console.log('Email:      hillarytaley@gmail.com');
console.log('Staff Code: ' + code2);
console.log('Hash:       ' + hash2);
console.log('--------------------------------------------------------------------------------');
console.log('');
console.log('================================================================================');
console.log('📋 SQL STATEMENTS - Run these in Supabase SQL Editor:');
console.log('================================================================================');
console.log('');
console.log(`UPDATE admin_staff
SET staff_code_hash = '${hash1}',
    is_active = true
WHERE email = 'florahcherotich@gmail.com';`);
console.log('');
console.log(`UPDATE admin_staff
SET staff_code_hash = '${hash2}',
    is_active = true
WHERE email = 'hillarytaley@gmail.com';`);
console.log('');
console.log('================================================================================');
console.log('');

