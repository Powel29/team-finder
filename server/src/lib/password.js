import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

// A low cost keeps the test suite fast; production uses the standard 12 rounds.
const ROUNDS = env.isTest ? 4 : 12;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
