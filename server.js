const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import UUID generator

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve the index.html file directly so "Magic Links" work nicely
app.use(express.static(__dirname));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'db.json');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

const readDb = () => {
    if (!fs.existsSync(DB_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(DB_FILE)); } catch (e) { return []; }
};
const writeDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- ROUTES ---

// 1. Upload with UUID Generation
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        const { iv, salt } = req.body;
        const file = req.file;
        const fileId = uuidv4(); // Generate Magic ID

        const db = readDb();
        const newFile = {
            id: fileId,
            fileName: file.filename,
            originalName: file.originalname,
            iv: iv,
            salt: salt
        };
        
        db.push(newFile);
        writeDb(db);

        res.json({ message: "File stored", id: fileId });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 2. Get Metadata for a Single File (For Magic Links)
app.get('/api/file/:id', (req, res) => {
    const db = readDb();
    const file = db.find(f => f.id === req.params.id);
    if (file) res.json(file);
    else res.status(404).json({ error: "File not found" });
});

// 3. List All Files
app.get('/files', (req, res) => res.json(readDb()));

// 4. Download File Blob
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (fs.existsSync(filePath)) res.download(filePath);
    else res.status(404).json({ error: "File not found" });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

