require('dotenv').config();
const pool = require('./db');

const menuItems = [
  {
    name: 'Premium Wagyu Steak',
    description: 'Grilled to perfection with rosemary butter and seasonal vegetables',
    price: 4800,
    image_url: 'https://images.unsplash.com/photo-1676300185292-e23bb3db50fa?w=600',
    category: 'Mains',
    display_order: 1,
  },
  {
    name: 'Truffle Pasta',
    description: 'Fresh handmade pasta with black truffle and parmesan cream',
    price: 3500,
    image_url: 'https://images.unsplash.com/photo-1609166639722-47053ca112ea?w=600',
    category: 'Mains',
    display_order: 2,
  },
  {
    name: 'Signature Sushi Platter',
    description: 'Assorted premium sushi with wasabi and pickled ginger',
    price: 5400,
    image_url: 'https://images.unsplash.com/photo-1735190093631-d66ecd1bc433?w=600',
    category: 'Mains',
    display_order: 3,
  },
  {
    name: 'Gourmet Plating',
    description: "Chef's special creation with seasonal ingredients",
    price: 4200,
    image_url: 'https://images.unsplash.com/photo-1764397514739-57a0ac81330d?w=600',
    category: 'Specials',
    display_order: 4,
  },
  {
    name: 'Craft Cocktails',
    description: 'Handcrafted cocktails made with premium spirits',
    price: 650,
    image_url: 'https://images.unsplash.com/photo-1673968872147-30bcd4bea38b?w=600',
    category: 'Beverages',
    display_order: 5,
  },
  {
    name: 'Decadent Chocolate',
    description: 'Rich chocolate dessert with gold leaf and berry coulis',
    price: 550,
    image_url: 'https://images.unsplash.com/photo-1737700088028-fae0666feb83?w=600',
    category: 'Desserts',
    display_order: 6,
  },
];

const tables = [
  { table_number: 'T1', capacity: 2, location: 'Window' },
  { table_number: 'T2', capacity: 2, location: 'Window' },
  { table_number: 'T3', capacity: 4, location: 'Main Hall' },
  { table_number: 'T4', capacity: 4, location: 'Main Hall' },
  { table_number: 'T5', capacity: 6, location: 'Main Hall' },
  { table_number: 'T6', capacity: 4, location: 'Patio' },
  { table_number: 'T7', capacity: 2, location: 'Bar' },
  { table_number: 'T8', capacity: 8, location: 'Private Room' },
];

(async () => {
  try {
    const menuCount = await pool.query('SELECT COUNT(*)::int AS count FROM menu_items');
    if (menuCount.rows[0].count === 0) {
      for (const item of menuItems) {
        await pool.query(
          `INSERT INTO menu_items (name, description, price, image_url, category, display_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [item.name, item.description, item.price, item.image_url, item.category, item.display_order]
        );
      }
      console.log(`✔ Seeded ${menuItems.length} menu items.`);
    } else {
      console.log('menu_items already has data — skipping menu seed.');
    }

    const tableCount = await pool.query('SELECT COUNT(*)::int AS count FROM restaurant_tables');
    if (tableCount.rows[0].count === 0) {
      for (const table of tables) {
        await pool.query(
          `INSERT INTO restaurant_tables (table_number, capacity, location)
           VALUES ($1, $2, $3)`,
          [table.table_number, table.capacity, table.location]
        );
      }
      console.log(`✔ Seeded ${tables.length} tables.`);
    } else {
      console.log('restaurant_tables already has data — skipping table seed.');
    }
  } catch (err) {
    console.error('✘ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
