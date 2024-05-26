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

// Main page
app.get('/', (req, res) => {
  res.render('landing-page');
});

// Log in - Sign up
app.get('/login', (req, res) => {
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
      res.redirect('/login');
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
      req.session.user = user;
    
      if(user.Position === 'Manager') {
        req.session.role = 'admin';
        res.redirect('/admin');
      } else {
        res.redirect('/staff');
        req.session.role = 'staff';
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

// Admin Session
app.get('/admin', (req, res) => {
  if (req.session.role === 'admin') {
    res.render('admin', {user: req.session.user});
  } else {
    res.redirect('/staff-login');
  }
})

// Manage Guests
app.get('/manage-users', async (req, res) => {
  if (req.session.role === 'admin') {
      try {
          const { filterName, filterUsername, filterDOB, filterPhone, filterAddress, filterEmail, orderBy, desc } = req.query;
          let query = `SELECT * FROM Guest WHERE 1=1`;
          if (filterName) {
            query += ` AND Name LIKE '%${filterName}%'`;
          }
          if (filterUsername) {
            query += ` AND Username LIKE '%${filterUsername}%'`;
          }
          if (filterEmail) {
            query += ` AND Email LIKE '%${filterEmail}%'`;
          }
          if (filterDOB) {
            query += ` AND DOB LIKE '%${filterDOB}%'`;
          }
          if (filterPhone) {
            query += ` AND Phone LIKE '%${filterPhone}%'`;
          }
          if (filterAddress) {
            query += ` AND Address LIKE '%${filterAddress}%'`;
          }
          if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
          } else {
            query += ` ORDER BY GuestID`;
          }
          if (desc === 'DESC') {
            query += ` DESC`;
          }
          console.log(query);
          await sql.connect(sqlConfig);
          const result = await sql.query(query);
          res.render('manage-users', { users: result.recordset});
      } catch (err) {
          console.error('SQL error', err);
          res.status(500).send('Internal Server Error');
      }
  } else {
      res.redirect('/admin');
  }
});

app.post('/delete-user', async (req, res) => {
  const { GuestID } = req.body;
  try {
    await sql.connect(sqlConfig);
    await sql.query`DELETE FROM Guest WHERE GuestID = ${GuestID}`;
    res.redirect('/manage-users');
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/add-user', async (req, res) => {
  const { username, password, name, dob, address, phone, email } = req.body;
  try {
      await sql.connect(sqlConfig);
      await sql.query`INSERT INTO Guest (Username, Password, Name, DOB, Address, Phone, Email ) VALUES (${username}, ${password}, ${name}, ${dob}, ${address}, ${phone}, ${email})`;
      res.redirect('/manage-users');
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/modify-user', async (req, res) => {
  const guestID = req.query.GuestID;

  try {
      await sql.connect(sqlConfig);
      const result = await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
      if (result.recordset.length === 0) {
          return res.status(404).send('User not found');
      }
      res.render('modify-user', { user: result.recordset[0] });
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/modify-user', async (req, res) => {
  const { guestID, name, dob, address, phone, email, oldpassword, newpassword } = req.body;

  try {
      await sql.connect(sqlConfig);
      // Step 1: Verify the current password
        const result = await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID} and Password = ${oldpassword}`;
        if (result.recordset.length === 0) {
            return res.status(404).send('Wrong password');
            //res.redirect('modify-user');
        }

      // Step 2: Dynamically build and execute individual update queries
      if (name) {
        await sql.query`UPDATE Guest SET Name = ${name} WHERE GuestID = ${guestID}`;
      }
      if (dob) {
        await sql.query`UPDATE Guest SET DOB = ${dob} WHERE GuestID = ${guestID}`;
      }
      if (address) {
        await sql.query`UPDATE Guest SET Address = ${address} WHERE GuestID = ${guestID}`;
      }
      if (phone) {
        await sql.query`UPDATE Guest SET Phone = ${phone} WHERE GuestID = ${guestID}`;
      }
      if (email) {
        await sql.query`UPDATE Guest SET Email = ${email} WHERE GuestID = ${guestID}`;
      }
      if (newpassword) {
        await sql.query`UPDATE Guest SET Password = ${newpassword} WHERE GuestID = ${guestID}`;
      }
      res.redirect('/manage-users')
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

// Manage Rooms
app.get('/manage-rooms', async (req, res) => {
  if (req.session.role === 'admin') {
    try {
        await sql.connect(sqlConfig);
        let query = 
        'select room.RoomNumber, RoomType.Description, RoomType.Capacity, RoomType.PricePerNight, Room.Status from room inner join RoomType on room.TypeID = RoomType.TypeID';
        const result = await sql.query(query);
        res.render('manage-rooms', { users: result.recordset});
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
  } else {
    res.redirect('/admin');
  }
});

app.post('/delete-room', async (req, res) => {
  const { UserID } = req.body;
  try {
    await sql.connect(sqlConfig);
    await sql.query`DELETE FROM Room WHERE RoomNumber = ${UserID}`;
    res.redirect('/manage-rooms');
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/add-room', async (req, res) => {
  const { RoomNumber, TypeID, Status } = req.body;
  console.log(RoomNumber);
  console.log(TypeID);
  console.log(Status);
  try {
      await sql.connect(sqlConfig);
      await sql.query`INSERT INTO Room (RoomNumber, TypeID, Status) VALUES (${RoomNumber}, ${TypeID}, ${Status})`;
      res.redirect('/manage-rooms');
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

// Staff Session
app.get('/staff', (req, res) => {
  if (req.session.role === 'staff') {
    res.render('staff', { user: req.session.user });
  } else {
    res.redirect('/staff-login');
  }
});

// Guest Session
app.get('/guest', async(req, res) => {
  if (req.session.role === 'guest') {
    try {
      await sql.connect(sqlConfig);
      let query = `SELECT * FROM AvailableRooms`;
      const result = await sql.query(query);
      res.render('guest', { users: result.recordset});
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
  } else {
      res.redirect('/login');
  }
});

app.get('/guest-bookings', async(req, res) => {
  if (req.session.role === 'guest') {
    try { 
      const guestID = req.session.user.GuestID;
      await sql.connect(sqlConfig);
      let query = `SELECT * FROM MyBookings(${guestID})`;
      const result = await sql.query(query);
      res.render('guest-bookings', { users: result.recordset});
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
  } else {
      res.redirect('/guest');
  }
});

app.get('/guest-payments', async(req, res) => {
  if (req.session.role === 'guest') {
    try { 
      const guestID = req.session.user.GuestID;
      await sql.connect(sqlConfig);
      let query = `SELECT * FROM MyPayments(${guestID}) WHERE 1=1`;
      const result = await sql.query(query);
      res.render('guest-payments', { users: result.recordset});
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
  } else {
      res.redirect('/guest');
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(8000, () => {
  console.log('Server started on http://localhost:8000');
});