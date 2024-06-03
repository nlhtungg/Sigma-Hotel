const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const sqlConfig = require('./sqlConfig');
const app = express();

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
        req.session.role = 'staff';
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

app.post('/signup', async (req, res) => {
  const { username, password, name, dob, address, phone, email } = req.body;
  try {
    await sql.connect(sqlConfig);
    // Check if username already exists
    const checkUsernameResult = await sql.query`SELECT Username FROM Guest WHERE Username = ${username}`;
    if (checkUsernameResult.recordset.length > 0) {
      req.session.message = 'Username already exists';
      return res.redirect('/signup');
    }
    const result = await sql.query`INSERT INTO Guest (Username, Password, Name, DOB, Address, Phone, Email) VALUES (${username}, ${password}, ${name}, ${dob}, ${address}, ${phone}, ${email})`;
    return res.redirect('/login');
  } catch (err) {
    console.error('SQL error', err);
    res.status(500).send('Internal Server Error');
  }
})

// Admin Session
app.get('/admin', (req, res) => {
  if (req.session.role === 'admin') {
    res.render('admin', {user: req.session.user});
  } else {
    res.redirect('/staff-login');
  }
});

// Manage Guests
app.get('/manage-users', async (req, res) => {
  if (req.session.role === 'admin') {
      try {
          const { filterName, filterUsername, filterDOB, filterPhone, filterAddress, filterEmail, orderBy, desc } = req.query;
          let query = `SELECT GuestID, Username, Password, Name, Address, Phone, Email, FORMAT(DOB, 'dd/MM/yyyy') AS Date
                       FROM guest WHERE 1=1`;
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

app.get('/edit-user', async (req, res) => {
  const guestID = req.query.GuestID;

  try {
      await sql.connect(sqlConfig);
      const result = await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
      if (result.recordset.length === 0) {
          return res.status(404).send('User not found');
      }
      res.render('edit-user', { user: result.recordset[0] });
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/edit-user', async (req, res) => {
  const { guestID, name, dob, address, phone, email, oldpassword, newpassword } = req.body;

  try {
      await sql.connect(sqlConfig);
      // Step 1: Verify the current password
        const result = await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
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

// Manage Staffs
app.get('/manage-staffs', async (req, res) => {
  if (req.session.role === 'admin') {
      try {
          const { filterName, filterUsername, filterDOB, filterPhone, filterAddress, filterEmail, filterPosition, orderBy, desc } = req.query;
          let query = `SELECT *, FORMAT(DOB, 'dd/MM/yyyy') AS Date FROM Staff WHERE 1=1`;
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
          if (filterPosition) {
            query += ` AND Position LIKE '%${filterPosition}%'`;
          }
          if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
          } else {
            query += ` ORDER BY StaffID`;
          }
          if (desc === 'DESC') {
            query += ` DESC`;
          }
          console.log(query);
          await sql.connect(sqlConfig);
          const result = await sql.query(query);
          res.render('manage-staffs', { users: result.recordset});
      } catch (err) {
          console.error('SQL error', err);
          res.status(500).send('Internal Server Error');
      }
  } else {
      res.redirect('/admin');
  }
});

app.get('/edit-staff', async (req, res) => {
  const staffID = req.query.StaffID;

  try {
      await sql.connect(sqlConfig);
      const result = await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID}`;
      if (result.recordset.length === 0) {
          return res.status(404).send('User not found');
      }
      res.render('edit-staff', { user: result.recordset[0] });
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/edit-staff', async (req, res) => {
  const { staffID, name, dob, position, salary, phone, email, oldpassword, newpassword } = req.body;

  try {
      await sql.connect(sqlConfig);
      // Step 1: Verify the current password
        const result = await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID} and Password = ${oldpassword}`;
        if (result.recordset.length === 0) {
            return res.status(404).send('Wrong password');
        }

      // Step 2: Dynamically build and execute individual update queries
      if (name) {
        await sql.query`UPDATE Staff SET Name = ${name} WHERE StaffID = ${staffID}`;
      }
      if (dob) {
        await sql.query`UPDATE Staff SET DOB = ${dob} WHERE StaffID = ${staffID}`;
      }
      if (phone) {
        await sql.query`UPDATE Staff SET Phone = ${phone} WHERE StaffID = ${staffID}`;
      }
      if (email) {
        await sql.query`UPDATE Staff SET Email = ${email} WHERE StaffID = ${staffID}`;
      }
      if (newpassword) {
        await sql.query`UPDATE Staff SET Password = ${newpassword} WHERE StaffID = ${staffID}`;
      }
      if (position) {
        await sql.query`UPDATE Staff SET Address = ${position} WHERE StaffID = ${staffID}`;
      }
      if (salary) {
        await sql.query`UPDATE Staff SET Address = ${salary} WHERE StaffID = ${staffID}`;
      }
      res.redirect('/manage-staffs')
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
          `select Room.RoomNumber, Room.Status, RoomType.*, Staff.Name
          from Room left join RoomType on Room.TypeID = RoomType.TypeID
                    left join (Staff left join Manage on Staff.StaffID = Manage.StaffID) on Room.RoomNumber = Manage.RoomNumber`;
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
  try {
      await sql.connect(sqlConfig);
      await sql.query`INSERT INTO Room (RoomNumber, TypeID, Status) VALUES (${RoomNumber}, ${TypeID}, ${Status})`;
      await sql.query`INSERT INTO Manage (RoomNumber, StaffID) VALUES (${RoomNumber}, NULL)`; 
      res.redirect('/manage-rooms');
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/edit-room', async (req, res) => {
  const RoomNumber = req.query.RoomNumber;

  try {
      await sql.connect(sqlConfig);
      const result = await sql.query`
      SELECT Room.*, Manage.StaffID
      FROM Room left join Manage ON Room.RoomNumber = Manage.RoomNumber
      WHERE Room.RoomNumber = ${RoomNumber}`;
      if (result.recordset.length === 0) {
          return res.status(404).send('Room not found');
      }
      res.render('edit-room', { user: result.recordset[0] });
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/edit-room', async (req, res) => {
  const { roomnumber, typeid, status, managedby } = req.body;

  try {
      await sql.connect(sqlConfig);
      if (typeid) {
        await sql.query`UPDATE Room SET TypeID = ${typeid} WHERE RoomNumber = ${roomnumber}`;
      }
      if (status) {
        await sql.query`UPDATE Room SET Status = ${status} WHERE RoomNumber = ${roomnumber}`;
      }
      if (managedby) {
        await sql.query`UPDATE Manage SET StaffID = ${managedby} WHERE RoomNumber = ${roomnumber}`;
      }
      res.redirect('/manage-rooms')
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
});

// Manage Bookings
app.get('/manage-bookings', async (req, res) => {
  try {
      await sql.connect(sqlConfig);
      let query = `
      select Booking.*, FORMAT(Booking.CheckinDate, 'dd/MM/yyyy') AS inDate, FORMAT(Booking.CheckoutDate, 'dd/MM/yyyy') AS outDate, Payment.PaymentMethod
       from Booking join Payment on Booking.BookingID = Payment.BookingID`;
      const result = await sql.query(query);
      res.render('manage-bookings', { bookings: result.recordset});
  } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).send('Error fetching bookings');
  }
});

app.post('/delete-booking', async (req, res) => {
  const { BookingID } = req.body;
  try {
    await sql.connect(sqlConfig);
    await sql.query`DELETE FROM Booking WHERE BookingID = ${BookingID}`;
    res.redirect('/manage-bookings');
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
    res.render('guest', {user: req.session.user});
  } else {
    res.redirect('/login');
  }
});

app.get('/guest-rooms', async(req, res) => {
  if (req.session.role === 'guest') {
    try {
      await sql.connect(sqlConfig);
      let query = `SELECT * FROM AvailableRooms`;
      const result = await sql.query(query);
      res.render('guest-rooms', { users: result.recordset});
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
  } else {
      res.redirect('/login');
  }
});

app.get('/reservation', async (req, res) => {
  if (req.session.role === 'guest') {
    try {
      const roomnumber = req.query.RoomNumber;
      await sql.connect(sqlConfig);
      const result = await sql.query`SELECT * FROM AvailableRooms WHERE RoomNumber = ${roomnumber}`;
      if (result.recordset.length > 0) {
        res.render('reservation', { room: result.recordset[0], user: req.session.user });
      } else {
        res.status(404).send('Room not found');
      }
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
      let query = `SELECT BookingID, RoomNumber,
       FORMAT(CheckinDate, 'dd/MM/yyyy') AS inDate,
       FORMAT(CheckoutDate, 'dd/MM/yyyy') AS outDate,
       TotalPrice FROM MyBookings(${guestID})`;
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
      let query = `SELECT PaymentID, BookingID, Amount, FORMAT(PaymentDate, 'dd/MM/yyyy') AS PDate, PaymentMethod FROM MyPayments(${guestID}) WHERE 1=1`;
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

app.get('/guest-infos', async (req, res) => {
  if (req.session.role === 'guest') {
    try { 
      const guestID = req.session.user.GuestID;
      await sql.connect(sqlConfig);
      let query = `SELECT * FROM MyInfo(${guestID}) WHERE 1=1`;
      const result = await sql.query(query);
      res.render('guest-infos', { user: result.recordset[0]});
  } catch (err) {
      console.error('SQL error', err);
      res.status(500).send('Internal Server Error');
  }
  } else {
      res.redirect('/guest');
  }
});

app.post('/guest-infos', async (req, res) => {
  if (req.session.role === 'guest') {
      const { name, dob, address, email, phone, newpass, password } = req.body;
      const guestID = req.session.user.GuestID;
      try {
          await sql.connect(sqlConfig);
          const result = await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID} and Password = ${password}`;
          if (result.recordset.length === 0) {
            return res.status(404).send('Wrong password');
          } else {
            if(name) {
              await sql.query`UPDATE Guest SET Name = ${name} WHERE GuestID = ${guestID}`;
            }
            if(dob) {
              await sql.query`UPDATE Guest SET DOB = ${dob} WHERE GuestID = ${guestID}`;
            }
            if(address) {
              await sql.query`UPDATE Guest SET Address = ${address} WHERE GuestID = ${guestID}`;
            }
            if(email) {
              await sql.query`UPDATE Guest SET Email = ${email} WHERE GuestID = ${guestID}`;
            }
            if(phone) {
              await sql.query`UPDATE Guest SET Phone = ${phone} WHERE GuestID = ${guestID}`;
            }
            if(newpass) {
              await sql.query`UPDATE Guest SET Password = ${newpass} WHERE GuestID = ${guestID}`;
            }
            res.redirect('/guest');
          }
      } catch (err) {
          console.error('SQL error', err);
          res.status(500).send('Internal Server Error');
      }
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