const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const app = express();

// Configure SQL Server connection
const sqlConfig = {
    server: 'DESKTOP-256OKAM\\SQLEXPRESS',
    database: 'LoginApp',
    user: 'TungSQLUsername',
    password: '892678',
    Option: {
        trustedConnection:true
    }
};

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Setting up the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main here

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});