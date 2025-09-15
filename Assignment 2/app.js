const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'your-secret-key-change-this-in-production';

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456'
});

// Connect to MySQL and setup database
db.connect(err => {
  if (err) {
    return console.error('MySQL connection failed:', err);
  }
  console.log('Connected to MySQL');

  const setupQueries = [
    'CREATE DATABASE IF NOT EXISTS auth_db',
    'USE auth_db',
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  setupQueries.forEach((query, i) => {
    db.query(query, err => {
      if (err) {
        return console.error(`Setup error ${i + 1}:`, err);
      }
    });
  });
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html')
});
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/register.html')
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send('Fail');

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], err => {
      res.send(err?.code === 'ER_DUP_ENTRY' || err ? 'Fail' : 'Success');
    });
  } catch {
    res.send('Fail');
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send('Fail');
  
  // Check if user is already logged in
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.send('Fail: You are already logged in');
    } catch {
      // Token is invalid, continue with login
    }
  }
  
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err || !results.length) return res.send('Fail');
    
    try {
      const isValid = await bcrypt.compare(password, results[0].password);
      if (isValid) {
        const token = jwt.sign({ userId: results[0].id, username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.send('Success');
      } else {
        res.send('Fail');
      }
    } catch {
      res.send('Fail');
    }
  });
});

app.listen(3000, () => console.log('Server running at: http://localhost:3000'));