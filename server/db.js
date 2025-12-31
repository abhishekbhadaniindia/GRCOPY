import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const dbPath = join(__dirname, 'consignment.db');

let db;

function createTables(database) {
    database.serialize(() => {
        database.run(`
            CREATE TABLE IF NOT EXISTS consignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grNumber TEXT UNIQUE,
                date TEXT,
                logisticsName TEXT,
                logisticsAddress TEXT,
                sellerName TEXT,
                sellerAddress TEXT,
                buyerName TEXT,
                buyerAddress TEXT,
                deliveryChallan TEXT,
                dealerGST TEXT,
                truckNumber TEXT,
                driverName TEXT,
                driverPhone TEXT,
                productName TEXT,
                qtyBag TEXT,
                mt TEXT,
                freight TEXT,
                freightStatus TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating consignments table:', err.message);
            else console.log('Consignments table ready.');
        });

        database.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                logisticsName TEXT,
                logisticsAddress TEXT,
                sellerName TEXT,
                sellerAddress TEXT,
                dealerGST TEXT,
                securityPin TEXT DEFAULT '1234'
            )
        `, (err) => {
            if (err) console.error('Error creating settings table:', err.message);
            else {
                console.log('Settings table ready.');
                database.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
                    if (row && row.count === 0) {
                        database.run(`INSERT INTO settings (id, logisticsName, logisticsAddress, sellerName, sellerAddress, dealerGST) 
                               VALUES (1, 'RAHUL LOGISTICS', 'BIHAR 823001', 'KISHAN SEWA KENDRA', 'MANPUR, GAYA (BIHAR)', '10BZSPK9086L1ZN')`);
                    }
                });
            }
        });

        database.run(`
            CREATE TABLE IF NOT EXISTS parties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                address TEXT,
                type TEXT,
                gst TEXT
            )
        `);

        database.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grNumber TEXT,
                category TEXT,
                amount REAL,
                remark TEXT,
                date TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    });
}

export function connectDB() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to SQLite:', err.message);
        } else {
            console.log('Connected to SQLite database.');
            createTables(db);
        }
    });
    return db;
}

export const getDB = () => {
    if (!db) return connectDB();
    return db;
};

export const closeDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) reject(err);
                else {
                    db = null;
                    console.log('Database connection closed.');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

// Initial connection
connectDB();
