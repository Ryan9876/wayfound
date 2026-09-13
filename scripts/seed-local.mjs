import { localBackend } from './local-backend.mjs';
const backend = localBackend();
const email = process.env.WAYFOUND_SEED_EMAIL;
const password = process.env.WAYFOUND_SEED_PASSWORD;
if (!email || !password || password.length < 12) throw new Error('Set WAYFOUND_SEED_EMAIL and WAYFOUND_SEED_PASSWORD (at least 12 characters)');
const { data, error } = await backend.admin.auth.admin.listUsers();
if (error) throw error;
if (data.users.some(u => u.email === email)) {
 console.log('Local account already exists; no password or workspace was changed.');
} else {
 const { error } = await backend.admin.auth.admin.createUser({email,password,email_confirm:true});
 if (error) throw error;
 console.log('Local development account created. No fixture evidence was inserted.');
}
