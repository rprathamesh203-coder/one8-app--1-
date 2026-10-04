// One-off fixer for databases that were already seeded with USD prices
// (from before pricing switched to INR). Safe to run multiple times —
// it only touches rows matching these exact names.
require('dotenv').config();
const pool = require('./db');

const inrPrices = {
  'Premium Wagyu Steak': 4800,
  'Truffle Pasta': 3500,
  'Signature Sushi Platter': 5400,
  'Gourmet Plating': 4200,
  'Craft Cocktails': 650,
  'Decadent Chocolate': 550,
};

(async () => {
  try {
    let updated = 0;
    for (const [name, price] of Object.entries(inrPrices)) {
      const result = await pool.query(
        'UPDATE menu_items SET price = $1 WHERE name = $2 RETURNING id',
        [price, name]
      );
      updated += result.rowCount;
    }
    console.log(`✔ Updated ${updated} menu item(s) to INR pricing.`);
  } catch (err) {
    console.error('✘ Reprice failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
