import { execute } from './server/utils/dbHelper';

async function run() {
  try {
    await execute('ALTER TABLE school_settings ADD COLUMN results_published TINYINT(1) DEFAULT 0');
    console.log('Added results_published column to school_settings');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('results_published column already exists');
    } else {
      console.error(error);
    }
  }
  process.exit(0);
}

run();
