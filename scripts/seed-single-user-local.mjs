import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const email = process.env.WAYFOUND_SEED_EMAIL;
const password = process.env.WAYFOUND_SEED_PASSWORD;

if (!email || !password || password.length < 12) {
  throw new Error('Set WAYFOUND_SEED_EMAIL and WAYFOUND_SEED_PASSWORD (at least 12 characters)');
}

const { data, error } = await backend.admin.auth.admin.listUsers();
if (error) throw error;

for (const user of data.users) {
  if (user.email !== email) {
    const { error: deleteError } = await backend.admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  }
}

const retained = data.users.find(user => user.email === email);
if (retained) {
  const { error: updateError } = await backend.admin.auth.admin.updateUserById(retained.id, {
    password,
    email_confirm: true,
  });
  if (updateError) throw updateError;
  console.log('Single local owner account retained and password refreshed. Other local auth users were removed.');
} else {
  const { error: createError } = await backend.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;
  console.log('Single local owner account created. Other local auth users were removed.');
}
