const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sql = require('mssql/msnodesqlv8');
const cron = require('node-cron');
const path = require('path');
const sqlConfig = require('./sqlConfig');
const { isNull } = require('util');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
    })
);
app.use(express.static(path.join(__dirname, 'public')));

// Setting up the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Function to update room statuses
async function updateRoomStatus() {
    try {
        await sql.connect(sqlConfig);
        await sql.query`
          UPDATE Room
          SET Status = 'Occupied'
          WHERE RoomNumber IN (
              SELECT RoomNumber
              FROM Booking
              WHERE GETDATE() BETWEEN CheckinDate AND CheckoutDate
          );
          UPDATE Room
          SET Status = 'Available'
          WHERE RoomNumber NOT IN (
              SELECT RoomNumber
              FROM Booking
              WHERE GETDATE() BETWEEN CheckinDate AND CheckoutDate
          )`;
        console.log('Room statuses updated successfully.');
    } catch (err) {
        console.error('Error updating room statuses: ', err);
    }
}

// Schedule the task to run every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled task to update room statuses...');
    updateRoomStatus();
});

// Main page
app.get('/', (req, res) => {
    res.render('landing-page');
});

// Log in - Sign up
app.get('/login', (req, res) => {
    res.render('login', { loginfail: req.session.loginfail });
    req.session.message = null;
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Connect to SQL Server
        await sql.connect(sqlConfig);
        const result =
            await sql.query`SELECT * FROM Guest WHERE username = ${username} AND password = ${password}`;
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            req.session.user = user;
            req.session.role = 'guest';
            res.redirect('/guest');
        } else {
            req.session.loginfail = 'Invalid username or password';
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
        const result =
            await sql.query`SELECT * FROM Staff WHERE username = ${username} AND password = ${password}`;
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            req.session.user = user;

            if (user.Position === 'Manager') {
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
        const checkUsernameResult =
            await sql.query`SELECT Username FROM Guest WHERE Username = ${username}`;
        if (checkUsernameResult.recordset.length > 0) {
            req.session.message = 'Username already exists';
            return res.redirect('/signup');
        }
        const result =
            await sql.query`INSERT INTO Guest (Username, Password, Name, DOB, Address, Phone, Email) VALUES (${username}, ${password}, ${name}, ${dob}, ${address}, ${phone}, ${email})`;
        return res.redirect('/login');
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

// Admin Session
app.get('/admin', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin', { user: req.session.user });
    } else {
        res.redirect('/staff-login');
    }
});

// Manage Guests
app.get('/manage-users', async (req, res) => {
    if (req.session.role === 'admin') {
        try {
            const {
                filterName,
                filterUsername,
                filterDOB,
                filterPhone,
                filterAddress,
                filterEmail,
                orderBy,
                desc,
            } = req.query;
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
            res.render('manage-users', { users: result.recordset });
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
        const result =
            await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
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
    const {
        guestID,
        name,
        dob,
        address,
        phone,
        email,
        oldpassword,
        newpassword,
    } = req.body;

    try {
        await sql.connect(sqlConfig);
        // Step 1: Verify the current password
        const result =
            await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
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
        res.redirect('/manage-users');
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

// Manage Staffs
app.get('/manage-staffs', async (req, res) => {
    if (req.session.role === 'admin') {
        try {
            const {
                filterName,
                filterUsername,
                filterDOB,
                filterPhone,
                filterAddress,
                filterEmail,
                filterPosition,
                orderBy,
                desc,
            } = req.query;
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
            res.render('manage-staffs', { users: result.recordset });
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
        const result =
            await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID}`;
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
    const {
        staffID,
        name,
        dob,
        position,
        salary,
        phone,
        email,
        newpassword,
    } = req.body;

    try {
        await sql.connect(sqlConfig);
        // Step 1: Verify the current password
        const result =
            await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID}`;
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
            await sql.query`UPDATE Staff SET Position = ${position} WHERE StaffID = ${staffID}`;
        }
        if (salary) {
            await sql.query`UPDATE Staff SET Salary = ${salary} WHERE StaffID = ${staffID}`;
        }
        res.redirect('/manage-staffs');
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/delete-staff', async (req, res) => {
    const { staffID } = req.body;
    try {
        await sql.connect(sqlConfig);
        await sql.query`DELETE FROM Staff WHERE StaffID = ${staffID}`;
        res.redirect('/manage-staffs');
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/add-staff', async (req, res) => {
    const { username, password, name, dob, phone, email, position, salary } = req.body;
    try {
        await sql.connect(sqlConfig);
        await sql.query`INSERT INTO Staff (Username, Password, Name, DOB, Phone, Email, Position, Salary ) 
        VALUES (${username}, ${password}, ${name}, ${dob}, ${phone}, ${email}, ${position}, ${salary})`;
        res.redirect('/manage-staffs');
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

// Manage Rooms
app.get('/manage-rooms', async (req, res) => {
    if (req.session.role === 'admin') {
        try {
            const {
                filterRoom,
                filterType,
                filterCapacity,
                filterPrice,
                filterStatus,
                filterManage,
                orderBy,
                desc,
            } = req.query;
            await sql.connect(sqlConfig);
            let query = `select Room.RoomNumber, Room.Status, RoomType.*, Staff.Name
          from Room left join RoomType on Room.TypeID = RoomType.TypeID
                    left join (Staff left join Manage on Staff.StaffID = Manage.StaffID) on Room.RoomNumber = Manage.RoomNumber
          where 1=1`;
            if (filterRoom) {
                query += ` and Room.RoomNumber = ${filterRoom}`;
            }
            if (filterType) {
                query += ` and RoomType.Description like '%${filterType}%'`;
            }
            if (filterCapacity) {
                query += ` and RoomType.Capacity = ${filterCapacity}`;
            }
            if (filterPrice) {
                query += ` and RoomType.PricePerNight <= ${filterPrice}`;
            }
            if (filterStatus) {
                query += ` and Room.Status = '${filterStatus}'`;
            }
            if (filterManage) {
                query += ` and Name like '%${filterManage}%'`;
            }
            if (orderBy) {
                query += ` order by ${orderBy}`;
                if (desc === 'DESC') query += ` DESC`;
            }
            const result = await sql.query(query);
            res.render('manage-rooms', { users: result.recordset });
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
            await sql.query`
            DELETE FROM Manage WHERE RoomNumber = ${roomnumber}
            INSERT INTO Manage (RoomNumber, StaffID) VALUES (${roomnumber}, ${managedby})`;
        }
        res.redirect('/manage-rooms');
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
        res.render('manage-bookings', { bookings: result.recordset });
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

app.get('/manage-payments', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const {filterGuest, filterMethod, filterAmount, orderBy, desc} = req.query;
        let query = `
      select payment.*, FORMAT(Payment.PaymentDate, 'dd/MM/yyyy') as PDate, booking.GuestID 
      from Payment join Booking on Payment.BookingID = Booking.BookingID
      WHERE 1=1`;
        if (filterGuest) {
            query += ` AND Booking.GuestID = ${filterGuest}`;
        }
        if (filterAmount) {
            query += ` AND Payment.Amount <= ${filterAmount}`;
        }
        if (filterMethod) {
            query += ` AND Payment.PaymentMethod = '${filterMethod}'`;
        }
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        if (desc == "DESC"){
            query += ` desc`;
        }
        console.log(query);
        const result = await sql.query(query);
        res.render('manage-payments', { payments: result.recordset });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('Error fetching bookings');
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

app.get('/staff-rooms', async (req, res) => {
    if (req.session.role === 'staff') {
        await sql.connect(sqlConfig);
        const staffID = req.session.user.StaffID;
        const { filterRoom, filterType, filterStatus, orderBy, desc } =
            req.query;
        let query = `select manage.StaffID, room.RoomNumber, Room.Status, RoomType.Description
     from room join manage on manage.RoomNumber = room.RoomNumber
               join RoomType on room.TypeID = RoomType.TypeID 
    where manage.StaffID = ${staffID}`;
        if (filterRoom) {
            query += ` AND Room.RoomNumber = ${filterRoom}`;
        }
        if (filterType) {
            query += ` AND RoomType.Description = '${filterType}'`;
        }
        if (filterStatus) {
            query += ` AND Room.Status = '${filterStatus}'`;
        }
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        if (desc === 'DESC') {
            query += ` desc`;
        }
        const result = await sql.query(query);
        console.log(query);
        res.render('staff-rooms', {
            rooms: result.recordset,
            updatedStatus: null,
        });
    }
});

app.get('/staff-update-room', async (req, res) => {
    const RoomNumber = req.query.RoomNumber;
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query`
    SELECT Room.RoomNumber, Room.Status, RoomType.Description
    FROM Room Join RoomType ON Room.TypeID = RoomType.TypeID
    WHERE Room.RoomNumber = ${RoomNumber}`;
        if (result.recordset.length === 0) {
            return res.status(404).send('Room not found');
        }
        console.log(result.recordset[0].RoomNumber);
        res.render('staff-update-room', { room: result.recordset[0] });
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/staff-update-room', async (req, res) => {
    const { RoomNumber, Status } = req.body;
    try {
        await sql.connect(sqlConfig);
        let query = `UPDATE Room SET Status = '${Status}' WHERE RoomNumber = ${RoomNumber}`;
        await sql.query(query);
        console.log(query);
        res.redirect('/staff-rooms');
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).send('Error updating room status');
    }
});

app.get('/staff-infos', async (req, res) => {
    if (req.session.role === 'staff') {
        try {
            req.session.wrongpass = null;
            req.session.success = null;
            const staffID = req.session.user.StaffID;
            await sql.connect(sqlConfig);
            let query = `SELECT * FROM Staff WHERE StaffID = ${staffID}`;
            const result = await sql.query(query);
            res.render('staff-infos', {
                staff: result.recordset[0],
                wrongpass: req.session.wrongpass,
                success: req.session.success,
            });
        } catch (err) {
            console.error('SQL error', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/staff');
    }
});

app.post('/staff-infos', async (req, res) => {
    if (req.session.role === 'staff') {
        const { name, dob, position, email, phone, newpass, password } =
            req.body;
        const staffID = req.session.user.StaffID;
        try {
            await sql.connect(sqlConfig);
            let result =
                await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID} and Password = ${password}`;
            if (result.recordset.length === 0) {
                result =
                    await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID}`;
                req.session.wrongpass = 'Wrong password';
                res.render('staff-infos', {
                    staff: result.recordset[0],
                    wrongpass: req.session.wrongpass,
                    success: null,
                });
            } else {
                if (name) {
                    await sql.query`UPDATE staff SET Name = ${name} WHERE staffID = ${staffID}`;
                }
                if (dob) {
                    await sql.query`UPDATE staff SET DOB = ${dob} WHERE staffID = ${staffID}`;
                }
                if (position) {
                    await sql.query`UPDATE staff SET Position = ${position} WHERE staffID = ${staffID}`;
                }
                if (email) {
                    await sql.query`UPDATE staff SET Email = ${email} WHERE staffID = ${staffID}`;
                }
                if (phone) {
                    await sql.query`UPDATE staff SET Phone = ${phone} WHERE staffID = ${staffID}`;
                }
                if (newpass) {
                    await sql.query`UPDATE staff SET Password = ${newpass} WHERE staffID = ${staffID}`;
                }
                req.session.success = 'Update successfully!';
                result =
                    await sql.query`SELECT * FROM Staff WHERE StaffID = ${staffID}`;
                res.render('staff-infos', {
                    staff: result.recordset[0],
                    wrongpass: null,
                    success: req.session.success,
                });
            }
        } catch (err) {
            console.error('SQL error', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/login');
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

app.get('/guest-rooms', async (req, res) => {
    if (req.session.role === 'guest') {
        try {
            const {
                filterRoom,
                filterStatus,
                filterType,
                filterPrice,
                filterCapacity,
                orderBy,
                desc,
            } = req.query;
            await sql.connect(sqlConfig);
            let query = `
      select Room.RoomNumber, Room.Status, RoomType.*
      from Room join RoomType on Room.TypeID = RoomType.TypeID
      where 1=1`;
            if (filterRoom) {
                query += ` and Room.RoomNumber like '%${filterRoom}%'`;
            }
            if (filterStatus) {
                query += ` and Room.Status = '${filterStatus}'`;
            }
            if (filterType) {
                query += ` and RoomType.TypeID = '${filterType}'`;
            }
            if (filterPrice) {
                query += ` and RoomType.PricePerNight = ${filterPrice}`;
            }
            if (filterCapacity) {
                query += ` and RoomType.Capacity = ${filterCapacity}`;
            }
            if (orderBy) {
                query += ` order by ${orderBy}`;
                if (desc === 'DESC') {
                    query += ` desc`;
                }
            }
            const result = await sql.query(query);
            console.log(query);
            res.render('guest-rooms', { rooms: result.recordset });
        } catch (err) {
            console.error('SQL error', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/guest-reservation', async (req, res) => {
    if (req.session.role === 'guest') {
        try {
            const roomnumber = req.query.RoomNumber;
            await sql.connect(sqlConfig);
            const result =
                await sql.query`select Room.RoomNumber, Room.Status, RoomType.*
      from Room join RoomType on Room.TypeID = RoomType.TypeID
      where RoomNumber = ${roomnumber}`;
            if (result.recordset.length > 0) {
                req.session.checkres = null;
                res.render('guest-reservation', {
                    room: result.recordset[0],
                    user: req.session.user,
                    checkres: req.session.checkres,
                });
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

app.post('/guest-reservation', async (req, res) => {
    try {
        const { roomnumber, startDate, endDate, paymentMethod } = req.body;
        await sql.connect(sqlConfig);
        const query = `
          SELECT * FROM Booking
          WHERE RoomNumber = ${roomnumber}
          AND (
              (checkinDate <= '${endDate}' AND checkinDate >= '${startDate}')
              OR (checkoutDate <= '${endDate}' AND checkoutDate >= '${startDate}')
              OR (checkinDate <= '${startDate}' AND checkoutDate >= '${endDate}')
          )
        `;
        console.log(query);
        const result1 = await sql.query(query);
        const result =
            await sql.query`select Room.RoomNumber, Room.Status, RoomType.*
        from Room join RoomType on Room.TypeID = RoomType.TypeID
        where RoomNumber = ${roomnumber}`;
        const today =
            await sql.query`select format(getdate(), 'yyyy-MM-dd') as date`;
        console.log(today.recordset[0].date);
        if (endDate > startDate && startDate >= today.recordset[0].date) {
            if (result1.recordset.length === 0) {
                const pricePerNight = result.recordset[0].PricePerNight;
                const totalPrice = calculateTotalPrice(
                    startDate,
                    endDate,
                    pricePerNight
                );
                req.session.bookingDetails = {
                    roomnumber,
                    startDate,
                    endDate,
                    paymentMethod,
                    totalPrice,
                };
                res.redirect('/confirm-booking');
            } else {
                req.session.checkres = 'Room is not available at that time';
                res.render('guest-reservation', {
                    room: result.recordset[0],
                    user: req.session.user,
                    checkres: req.session.checkres,
                });
            }
        } else {
            req.session.checkres = 'Invalid Dates';
            res.render('guest-reservation', {
                room: result.recordset[0],
                user: req.session.user,
                checkres: req.session.checkres,
            });
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({
            error: 'An error occurred while checking availability',
        });
    }
});

function calculateTotalPrice(checkinDate, checkoutDate, pricePerNight) {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const differenceInTime = checkout.getTime() - checkin.getTime();
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    return differenceInDays * pricePerNight;
}

app.get('/confirm-booking', async (req, res) => {
    try {
        const bookingDetails = req.session.bookingDetails;
        if (!bookingDetails) {
            res.redirect('/guest-reservation');
            return;
        }
        res.render('confirm-booking', {
            roomnumber: bookingDetails.roomnumber,
            startDate: bookingDetails.startDate,
            endDate: bookingDetails.endDate,
            totalPrice: bookingDetails.totalPrice,
            paymentMethod: bookingDetails.paymentMethod,
        });
    } catch (error) {
        console.error('Error loading confirmation page:', error);
        res.status(500).json({
            error: 'An error occurred while loading the confirmation page',
        });
    }
});

app.post('/confirm-booking', async (req, res) => {
    try {
        const guestID = req.session.user.GuestID;
        const bookingDetails = req.session.bookingDetails;
        await sql.connect(sqlConfig);
        const insertBooking = `EXEC CreateBookingAndPayment
    @GuestID = ${guestID},
    @RoomNumber = ${bookingDetails.roomnumber},
    @CheckinDate = '${bookingDetails.startDate}',
    @CheckoutDate = '${bookingDetails.endDate}',
    @PaymentMethod = '${bookingDetails.paymentMethod}';`;
        console.log(insertBooking);
        await sql.query(insertBooking);
        res.redirect('/guest-bookings');
    } catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({
            error: 'An error occurred while confirming the booking',
        });
    }
});

app.get('/guest-bookings', async (req, res) => {
    if (req.session.role === 'guest') {
        try {
            const {
                filterRoom,
                filterCheckin,
                filterCheckout,
                filterPrice,
                orderBy,
                desc,
            } = req.query;
            const guestID = req.session.user.GuestID;
            const cancelfail = null;
            await sql.connect(sqlConfig);
            let query = `SELECT BookingID, RoomNumber,
       FORMAT(CheckinDate, 'dd/MM/yyyy') AS inDate,
       FORMAT(CheckoutDate, 'dd/MM/yyyy') AS outDate,
       TotalPrice FROM MyBookings(${guestID})
       WHERE 1=1`;
            if (filterRoom) {
                query += ` AND RoomNumber = ${filterRoom}`;
            }
            if (filterCheckin) {
                query += ` AND CheckinDate = '${filterCheckin}'`;
            }
            if (filterCheckout) {
                query += ` AND CheckoutDate = '${filterCheckout}'`;
            }
            if (filterPrice) {
                query += ` AND TotalPrice <= ${filterPrice}`;
            }
            if (orderBy) {
                query += ` ORDER BY ${orderBy}`;
                if (desc === 'DESC') query += ` DESC`;
            }
            const result = await sql.query(query);
            res.render('guest-bookings', {
                users: result.recordset,
                cancelfail,
            });
        } catch (err) {
            console.error('SQL error', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/guest');
    }
});

app.post('/cancel-booking', async (req, res) => {
    const { BookingID } = req.body;
    try {
        const {
            filterRoom,
            filterCheckin,
            filterCheckout,
            filterPrice,
            orderBy,
            desc,
        } = req.query;
        const guestID = req.session.user.GuestID;
        await sql.connect(sqlConfig);
        const query1 = `EXEC DeleteBooking @BookingID = ${BookingID}`;
        const noti = await sql.query(query1);
        let query = `SELECT BookingID, RoomNumber,
       FORMAT(CheckinDate, 'dd/MM/yyyy') AS inDate,
       FORMAT(CheckoutDate, 'dd/MM/yyyy') AS outDate,
       TotalPrice FROM MyBookings(${guestID})
       WHERE 1=1`;
        console.log(query);
        if (filterRoom) {
            query += ` AND RoomNumber = ${filterRoom}`;
        }
        if (filterCheckin) {
            query += ` AND CheckinDate = '${filterCheckin}'`;
        }
        if (filterCheckout) {
            query += ` AND CheckoutDate = '${filterCheckout}'`;
        }
        if (filterPrice) {
            query += ` AND TotalPrice <= ${filterPrice}`;
        }
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
            if (desc === 'DESC') query += ` DESC`;
        }
        const result = await sql.query(query);
        console.log(query1);
        res.render('guest-bookings', {
            users: result.recordset,
            cancelfail: noti.recordset[0].Result,
        });
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/guest-payments', async (req, res) => {
    if (req.session.role === 'guest') {
        try {
            const guestID = req.session.user.GuestID;
            await sql.connect(sqlConfig);
            let query = `SELECT PaymentID, BookingID, Amount, FORMAT(PaymentDate, 'dd/MM/yyyy') AS PDate, PaymentMethod FROM MyPayments(${guestID}) WHERE 1=1`;
            const result = await sql.query(query);
            res.render('guest-payments', { users: result.recordset });
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
            req.session.wrongpass = null;
            req.session.success = null;
            const guestID = req.session.user.GuestID;
            await sql.connect(sqlConfig);
            let query = `SELECT * FROM MyInfo(${guestID}) WHERE 1=1`;
            const result = await sql.query(query);
            res.render('guest-infos', {
                user: result.recordset[0],
                wrongpass: req.session.wrongpass,
                success: req.session.success,
            });
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
        const { name, dob, address, email, phone, newpass, password } =
            req.body;
        const guestID = req.session.user.GuestID;
        try {
            await sql.connect(sqlConfig);
            let result =
                await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID} and Password = ${password}`;
            if (result.recordset.length === 0) {
                result =
                    await sql.query`SELECT * FROM Guest WHERE GuestID = ${guestID}`;
                req.session.wrongpass = 'Wrong password';
                res.render('guest-infos', {
                    user: result.recordset[0],
                    wrongpass: req.session.wrongpass,
                    success: null,
                });
            } else {
                if (name) {
                    await sql.query`UPDATE Guest SET Name = ${name} WHERE GuestID = ${guestID}`;
                }
                if (dob) {
                    await sql.query`UPDATE Guest SET DOB = ${dob} WHERE GuestID = ${guestID}`;
                }
                if (address) {
                    await sql.query`UPDATE Guest SET Address = ${address} WHERE GuestID = ${guestID}`;
                }
                if (email) {
                    await sql.query`UPDATE Guest SET Email = ${email} WHERE GuestID = ${guestID}`;
                }
                if (phone) {
                    await sql.query`UPDATE Guest SET Phone = ${phone} WHERE GuestID = ${guestID}`;
                }
                if (newpass) {
                    await sql.query`UPDATE Guest SET Password = ${newpass} WHERE GuestID = ${guestID}`;
                }
                req.session.success = 'Update successfully!';
                result =
                    await sql.query`SELECT * FROM Guest WHERE GuestID =${guestID}`;
                res.render('guest-infos', {
                    user: result.recordset[0],
                    wrongpass: null,
                    success: req.session.success,
                });
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
