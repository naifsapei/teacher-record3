import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLocalAuthUser, getLocalAuthUser, getPersistedLocalAuthUser, persistLocalAuthUser } from './localAuth.js';

const createStorage = () => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
};

test('auth fallback accepts seeded admin credentials', () => {
  const user = getLocalAuthUser('admin@teacher-record.local', 'admin123');
  assert.ok(user);
  assert.equal(user.role, 'admin');
});

test('auth fallback rejects invalid password', () => {
  const user = getLocalAuthUser('teacher@teacher-record.local', 'wrong-password');
  assert.equal(user, null);
});

test('auth fallback persists and retrieves the current user', () => {
  global.localStorage = createStorage();
  const user = getLocalAuthUser('teacher@teacher-record.local', 'teacher123');
  assert.ok(user);

  persistLocalAuthUser(user);
  const persisted = getPersistedLocalAuthUser();

  assert.deepEqual(persisted, user);
  clearLocalAuthUser();
  assert.equal(getPersistedLocalAuthUser(), null);
});
