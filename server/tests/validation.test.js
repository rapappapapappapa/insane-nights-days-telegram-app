const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEmail,
  isValidEmail,
  validatePassword,
  validateRegistration,
  parseBirthDate,
  validateAge,
  parseTicketQuantity,
  MAX_TICKET_QUANTITY,
} = require('../utils/validation');

test('normalizeEmail trim, lowercase et supprime caractères invisibles', () => {
  assert.equal(normalizeEmail('  Test@Mail.COM  '), 'test@mail.com');
  assert.equal(normalizeEmail('user\u200B@mail.com'), 'user@mail.com');
});

test('isValidEmail accepte les emails valides', () => {
  assert.equal(isValidEmail('alice@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('a@b'), false);
});

test('validatePassword respecte la longueur minimale', () => {
  assert.equal(validatePassword('').valid, false);
  assert.equal(validatePassword('12345').valid, false);
  assert.equal(validatePassword('123456').valid, true);
});

test('validateRegistration normalise email et pseudo', () => {
  const result = validateRegistration({
    email: '  User@Mail.COM ',
    username: '  pseudo ',
    password: 'secret123',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.normalizedData, {
    email: 'user@mail.com',
    username: 'pseudo',
    password: 'secret123',
  });
});

test('parseBirthDate valide le format jj/mm/aaaa', () => {
  assert.equal(parseBirthDate('31/12/1990').valid, true);
  assert.equal(parseBirthDate('32/01/1990').valid, false);
  assert.equal(parseBirthDate('1990-12-31').valid, false);
});

test('validateAge exige 18 ans minimum', () => {
  const adult = new Date();
  adult.setFullYear(adult.getFullYear() - 20);
  const minor = new Date();
  minor.setFullYear(minor.getFullYear() - 10);

  assert.equal(validateAge(adult).valid, true);
  assert.equal(validateAge(minor).valid, false);
});

test('parseTicketQuantity borne entre 1 et MAX_TICKET_QUANTITY', () => {
  assert.equal(parseTicketQuantity('0').valid, false);
  assert.equal(parseTicketQuantity('3').quantity, 3);
  assert.equal(parseTicketQuantity(String(MAX_TICKET_QUANTITY + 10)).quantity, MAX_TICKET_QUANTITY);
});
