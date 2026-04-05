import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function test() {
  try {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });
    await db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
    console.log('SQLite works');
  } catch (e) {
    console.error('SQLite error:', e);
  }
}

test();
