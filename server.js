const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const app = express();

// Configure SQL Server connection
const sqlConfig = {
    server: 'DESKTOP-256OKAM\\SQLEXPRESS',
    database: 'SigmaHotel',
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

// Log in - Sign up
app.get('/', (req, res) => {
    res.render('login', { message: req.session.message });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Connect to SQL Server
    await sql.connect(sqlConfig);
    const result = await sql.query`SELECT * FROM Guest WHERE username = ${username} AND password = ${password}`;

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      req.session.user = user;
      req.session.role = 'guest';
      res.redirect('/guest');
    } else {
      req.session.message = 'Invalid username or password';
      res.redirect('/');
    }
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/staff-login', (req, res) => {
  res.render('staff-login', { message: req.session.message });
});

app.post('/staff-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Connect to SQL Server
    await sql.connect(sqlConfig);
    const result = await sql.query`SELECT * FROM Staff WHERE username = ${username} AND password = ${password}`;
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log(user);
      req.session.user = user;
      if(user.Position === 'Manager') {
        res.redirect('/admin');
      } else {
        res.redirect('/staff');
      }
    } else {
      req.session.message = 'Invalid username or password';
      res.redirect('/staff-login');
    }
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/signup', (req, res) => {
    res.render('signup', { signupMessage: req.session.signupMessage });
});

// Staff Session
app.get('/staff', (req, res) => {
  if (req.session.role === 'staff') {
    res.render('staff', { user: req.session.user });
  } else {
    res.redirect('/');
  }
});

// Guest Session
app.get('/guest', (req, res) => {
  if (req.session.role === 'guest') {
      res.render('guest', { user: req.session.user });
  } else {
      res.redirect('/');
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});