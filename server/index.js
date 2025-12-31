import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { getDB, closeDB, connectDB, dbPath } from './db.js';

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Serve static files from the Vite build directory
const clientPath = path.join(__dirname, '../');
app.use(express.static(clientPath));

// Set up multer for database imports
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// Bulk Create
app.post('/api/consignments/bulk', (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'Expected an array' });

    const sql = `
        INSERT INTO consignments (
            grNumber, date, logisticsName, logisticsAddress, sellerName, 
            sellerAddress, buyerName, buyerAddress, deliveryChallan, 
            dealerGST, truckNumber, driverName, driverPhone, productName, 
            qtyBag, mt, freight, freightStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const db = getDB();
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(sql);

        let errors = [];
        list.forEach((data, index) => {
            stmt.run([
                data.grNumber, data.date, data.logisticsName, data.logisticsAddress, data.sellerName,
                data.sellerAddress, data.buyerName, data.buyerAddress, data.deliveryChallan,
                data.dealerGST, data.truckNumber, data.driverName, data.driverPhone, data.productName,
                data.qtyBag, data.mt, data.freight, data.freightStatus
            ], (err) => {
                if (err) errors.push(`Row ${index + 1}: ${err.message}`);
            });
        });

        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err || errors.length > 0) {
                return res.status(400).json({ error: errors.join(', ') || err.message });
            }
            res.json({ message: `Successfully imported ${list.length} records` });
        });
    });
});

// Create
app.post('/api/consignments', (req, res) => {
    const data = req.body;
    const sql = `
        INSERT INTO consignments (
            grNumber, date, logisticsName, logisticsAddress, sellerName, 
            sellerAddress, buyerName, buyerAddress, deliveryChallan, 
            dealerGST, truckNumber, driverName, driverPhone, productName, 
            qtyBag, mt, freight, freightStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        data.grNumber, data.date, data.logisticsName, data.logisticsAddress, data.sellerName,
        data.sellerAddress, data.buyerName, data.buyerAddress, data.deliveryChallan,
        data.dealerGST, data.truckNumber, data.driverName, data.driverPhone, data.productName,
        data.qtyBag, data.mt, data.freight, data.freightStatus
    ];

    getDB().run(sql, params, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Consignment created successfully' });
    });
});

// Read All
app.get('/api/consignments', (req, res) => {
    const sql = "SELECT * FROM consignments ORDER BY createdAt DESC";
    getDB().all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Read One
app.get('/api/consignments/:id', (req, res) => {
    const sql = "SELECT * FROM consignments WHERE id = ?";
    getDB().get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(row);
    });
});

// Update
app.put('/api/consignments/:id', (req, res) => {
    const data = req.body;
    const sql = `
        UPDATE consignments SET 
            grNumber = ?, date = ?, logisticsName = ?, logisticsAddress = ?, 
            sellerName = ?, sellerAddress = ?, buyerName = ?, buyerAddress = ?, 
            deliveryChallan = ?, dealerGST = ?, truckNumber = ?, driverName = ?, 
            driverPhone = ?, productName = ?, qtyBag = ?, mt = ?, 
            freight = ?, freightStatus = ?
        WHERE id = ?
    `;
    const params = [
        data.grNumber, data.date, data.logisticsName, data.logisticsAddress, data.sellerName,
        data.sellerAddress, data.buyerName, data.buyerAddress, data.deliveryChallan,
        data.dealerGST, data.truckNumber, data.driverName, data.driverPhone, data.productName,
        data.qtyBag, data.mt, data.freight, data.freightStatus, req.params.id
    ];

    getDB().run(sql, params, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Consignment updated successfully' });
    });
});

// Delete
app.delete('/api/consignments/:id', (req, res) => {
    const sql = "DELETE FROM consignments WHERE id = ?";
    getDB().run(sql, [req.params.id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Consignment deleted successfully' });
    });
});

// Settings API
app.get('/api/settings', (req, res) => {
    getDB().get("SELECT * FROM settings WHERE id = 1", (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(row);
    });
});

app.post('/api/settings/verify-pin', (req, res) => {
    const { pin } = req.body;
    getDB().get("SELECT securityPin FROM settings WHERE id = 1", (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        if (row && row.securityPin === pin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Incorrect PIN' });
        }
    });
});

app.put('/api/settings', (req, res) => {
    const data = req.body;
    const sql = `
        UPDATE settings SET 
            logisticsName = ?, logisticsAddress = ?, 
            sellerName = ?, sellerAddress = ?, dealerGST = ?,
            securityPin = ?
        WHERE id = 1
    `;
    const params = [
        data.logisticsName, data.logisticsAddress,
        data.sellerName, data.sellerAddress, data.dealerGST,
        data.securityPin
    ];

    getDB().run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Settings updated successfully' });
    });
});

// Party Master API
app.get('/api/parties', (req, res) => {
    getDB().all("SELECT * FROM parties ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/parties', (req, res) => {
    const { name, address, type, gst } = req.body;
    getDB().run("INSERT INTO parties (name, address, type, gst) VALUES (?, ?, ?, ?)", [name, address, type, gst], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.delete('/api/parties/:id', (req, res) => {
    getDB().run("DELETE FROM parties WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Expenses API
app.get('/api/expenses', (req, res) => {
    const { grNumber } = req.query;
    let sql = "SELECT * FROM expenses ORDER BY createdAt DESC";
    let params = [];
    if (grNumber) {
        sql = "SELECT * FROM expenses WHERE grNumber = ? ORDER BY createdAt DESC";
        params = [grNumber];
    }
    getDB().all(sql, params, (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/expenses', (req, res) => {
    const { grNumber, category, amount, remark, date } = req.body;
    getDB().run("INSERT INTO expenses (grNumber, category, amount, remark, date) VALUES (?, ?, ?, ?, ?)",
        [grNumber, category, amount, remark, date], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

// Clean DB API
app.post('/api/clean-db', (req, res) => {
    const db = getDB();
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM consignments");
        db.run("DELETE FROM parties");
        db.run("DELETE FROM expenses");
        db.run("COMMIT", (err) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Database cleaned successfully' });
        });
    });
});

// Backup API
app.get('/api/backup', (req, res) => {
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, 'consignment_backup.db');
    } else {
        res.status(404).json({ error: 'Database file not found' });
    }
});

// Import API
app.post('/api/import', upload.single('database'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // 1. Close current connection
        await closeDB();

        // 2. Replace database file
        fs.copyFileSync(req.file.path, dbPath);

        // 3. Delete temporary uploaded file
        fs.unlinkSync(req.file.path);

        // 4. Reconnect
        connectDB();

        res.json({ message: 'Database imported successfully' });
    } catch (err) {
        console.error('Import failed:', err);
        // Attempt to reconnect even if copy failed
        connectDB();
        res.status(500).json({ error: 'Failed to import database: ' + err.message });
    }
});

// Fallback to serve the frontend index.html for any unmatched routes
app.use((req, res) => {
    const indexPath = path.join(__dirname, '../index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built. Please run npm run build first.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
