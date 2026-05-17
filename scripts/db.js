import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Erreur: DATABASE_URL n\'est pas définie dans le fichier .env');
  process.exit(1);
}

async function main() {
  const command = process.argv[2];
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    if (command === 'schema') {
      const { rows } = await client.query(`
        SELECT 
          t.table_schema,
          t.table_name,
          c.column_name,
          c.data_type
        FROM 
          information_schema.tables t
        JOIN 
          information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE 
          t.table_schema = 'public'
        ORDER BY 
          t.table_name, c.ordinal_position;
      `);
      
      const schema = rows.reduce((acc, row) => {
        if (!acc[row.table_name]) acc[row.table_name] = [];
        acc[row.table_name].push({ column: row.column_name, type: row.data_type });
        return acc;
      }, {});
      
      console.log(JSON.stringify(schema, null, 2));
    } else if (command === 'exec') {
      const sql = process.argv[3];
      if (!sql) {
        console.error('Veuillez fournir une requête SQL à exécuter.');
        process.exit(1);
      }
      const res = await client.query(sql);
      console.log(JSON.stringify(res.rows || res, null, 2));
    } else if (command === 'execFile') {
      const fs = await import('fs');
      const filepath = process.argv[3];
      const sql = fs.readFileSync(filepath, 'utf8');
      const res = await client.query(sql);
      console.log('Fichier exécuté avec succès.');
    } else {
      console.log(`Commandes disponibles:
1. schema : Affiche la structure des tables
2. exec "SQL" : Exécute une requête SQL`);
    }

  } catch (err) {
    console.error('Erreur lors de l\'exécution:', err.message);
  } finally {
    await client.end();
  }
}

main();
