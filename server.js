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
          await sql.connect(sqlConfig);
          let query = 'SELECT * FROM guest';
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
  const { UserID } = req.body;
  try {
    await sql.connect(sqlConfig);
    await sql.query`DELETE FROM Guest WHERE Username = ${UserID}`;
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
  const guestID = req.query.Username;

  try {
      await sql.connect(sqlConfig);
      const result = await sql.query`SELECT * FROM Guest WHERE Username = ${guestID}`;
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
  const { guestID, username, name, dob, address, phone, email, oldpassword, newpassword } = req.body;

  try {
      await sql.connect(sqlConfig);
      // Update the guest information
      const updateSql = `
          UPDATE Guest
          SET
              Password = ${newpassword},
              Name = ${name},
              DOB = ${dob},
              Address = ${address},
              Phone = ${phone},
              Email = ${email}
          WHERE Username = ${GuestID};
      `;
      const updateRequest = new sql.Request();
      updateRequest.input('guestID', sql.Int, guestID);
      updateRequest.input('newpassword', sql.VarChar, newpassword || verifyPasswordResult.recordset[0].Password);
      updateRequest.input('name', sql.VarChar, name);
      updateRequest.input('dob', sql.Date, dob);
      updateRequest.input('address', sql.VarChar, address);
      updateRequest.input('phone', sql.VarChar, phone);
      updateRequest.input('email', sql.VarChar, email);

      await updateRequest.query(updateSql);

      res.redirect('/manage-users');
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
app.get('/guest', (req, res) => {
  if (req.session.role === 'guest') {
      res.render('guest', { user: req.session.user });
  } else {
      res.redirect('/login');
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(8000, () => {
  console.log('Server started on http://localhost:8000');
});