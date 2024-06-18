/* chay rieng dong nay truoc */
CREATE DATABASE SigmaHotel;

/* chay rieng dong nay */
USE SigmaHotel;

CREATE TABLE [RoomType] (
  [TypeID] varchar(50) PRIMARY KEY,
  [Description] varchar(255),
  [PricePerNight] decimal(10,2),
  [Capacity] int
)
GO


CREATE TABLE [Guest] (
  [GuestID] int IDENTITY(1,1) PRIMARY KEY,
  [Username] varchar(50) NOT NULL UNIQUE,
  [Password] varchar(50) NOT NULL,
  [Name] varchar(50),
  [DOB] date,
  [Address] varchar(255),
  [Phone] varchar(15),
  [Email] varchar(255)
)
GO


CREATE TABLE [Staff] (
  [StaffID] int IDENTITY(1,1) PRIMARY KEY,
  [Username] varchar(50) NOT NULL UNIQUE,
  [Password] varchar(50) NOT NULL,
  [Name] varchar(50),
  [Position] varchar(50),
  [Salary] decimal(10,2),
  [DOB] date,
  [Phone] varchar(15),
  [Email] varchar(255)
)
GO


CREATE TABLE [Room] (
  [RoomNumber] int PRIMARY KEY,
  [TypeID] varchar(50),
  [Status] varchar(20),
  FOREIGN KEY ([TypeID]) REFERENCES [RoomType] ([TypeID]) 
    ON DELETE CASCADE ON UPDATE CASCADE
)
GO


CREATE TABLE [Booking] (
  [BookingID] int IDENTITY(1,1) PRIMARY KEY,
  [GuestID] int,
  [RoomNumber] int,
  [CheckinDate] date,
  [CheckoutDate] date,
  [TotalPrice] decimal(10,2),
  FOREIGN KEY ([GuestID]) REFERENCES [Guest] ([GuestID]) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ([RoomNumber]) REFERENCES [Room] ([RoomNumber]) 
    ON DELETE CASCADE ON UPDATE CASCADE
)
GO


CREATE TABLE [Payment] (
  [PaymentID] int IDENTITY(1,1) PRIMARY KEY,
  [BookingID] int,
  [Amount] decimal(10,2),
  [PaymentDate] date,
  [PaymentMethod] varchar(50),
  FOREIGN KEY ([BookingID]) REFERENCES [Booking] ([BookingID]) 
    ON DELETE CASCADE ON UPDATE CASCADE
)
GO


CREATE TABLE [Manage] (
  [RoomNumber] int,
  [StaffID] int,
  FOREIGN KEY ([RoomNumber]) REFERENCES [Room] ([RoomNumber]) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ([StaffID]) REFERENCES [Staff] ([StaffID]) 
    ON DELETE CASCADE ON UPDATE CASCADE
)
GO

/*RoomType*/
INSERT INTO RoomType (TypeID, Description, PricePerNight, Capacity) VALUES
('RT001', 'Single Room', 100.00, 1),
('RT002', 'Double Room', 150.00, 2),
('RT003', 'Suite', 250.00, 4),
('RT004', 'Family Room', 200.00, 5),
('RT005', 'Deluxe Room', 300.00, 3),
('RT006', 'Economy Room', 80.00, 1),
('RT007', 'Business Room', 180.00, 2),
('RT008', 'Luxury Suite', 350.00, 3),
('RT009', 'Presidential Suite', 500.00, 4),
('RT010', 'Standard Room', 120.00, 2),
('RT011', 'Superior Room', 220.00, 3),
('RT012', 'Penthouse', 600.00, 5),
('RT013', 'Garden Room', 170.00, 2),
('RT014', 'Terrace Room', 210.00, 3),
('RT015', 'Cabana', 130.00, 2),
('RT016', 'Cottage', 190.00, 4),
('RT017', 'Beachfront Room', 280.00, 3),
('RT018', 'Honeymoon Suite', 400.00, 2),
('RT019', 'Junior Suite', 220.00, 3),
('RT020', 'Connecting Room', 240.00, 4);

/*Room*/
INSERT INTO Room (RoomNumber, TypeID, Status) VALUES
(101, 'RT001', 'Available'),
(102, 'RT002', 'Occupied'),
(103, 'RT003', 'Available'),
(104, 'RT004', 'Maintenance'),
(105, 'RT005', 'Available'),
(106, 'RT006', 'Occupied'),
(107, 'RT007', 'Available'),
(108, 'RT008', 'Occupied'),
(109, 'RT009', 'Available'),
(110, 'RT010', 'Maintenance'),
(111, 'RT011', 'Available'),
(112, 'RT012', 'Occupied'),
(113, 'RT013', 'Available'),
(114, 'RT014', 'Occupied'),
(115, 'RT015', 'Available'),
(116, 'RT016', 'Maintenance'),
(117, 'RT017', 'Available'),
(118, 'RT018', 'Occupied'),
(119, 'RT019', 'Available'),
(120, 'RT020', 'Occupied');

/*Guest*/
INSERT INTO Guest (Username, Password, Name, DOB, Address, Phone, Email) VALUES
('guest1', 'pass1', 'John Doe', '1980-01-01', '123 Main St', '1234567890', 'john@example.com'),
('guest2', 'pass2', 'Jane Smith', '1985-02-02', '456 Elm St', '1234567891', 'jane@example.com'),
('guest3', 'pass3', 'Alice Johnson', '1990-03-03', '789 Oak St', '1234567892', 'alice@example.com'),
('guest4', 'pass4', 'Bob Brown', '1995-04-04', '101 Maple St', '1234567893', 'bob@example.com'),
('guest5', 'pass5', 'Charlie Davis', '1988-05-05', '202 Pine St', '1234567894', 'charlie@example.com'),
('guest6', 'pass6', 'Diana Evans', '1975-06-06', '303 Cedar St', '1234567895', 'diana@example.com'),
('guest7', 'pass7', 'Ethan Green', '1983-07-07', '404 Birch St', '1234567896', 'ethan@example.com'),
('guest8', 'pass8', 'Fiona Harris', '1992-08-08', '505 Walnut St', '1234567897', 'fiona@example.com'),
('guest9', 'pass9', 'George King', '1987-09-09', '606 Ash St', '1234567898', 'george@example.com'),
('guest10', 'pass10', 'Hannah Lee', '1984-10-10', '707 Redwood St', '1234567899', 'hannah@example.com'),
('guest11', 'pass11', 'Ian Moore', '1979-11-11', '808 Spruce St', '1234567800', 'ian@example.com'),
('guest12', 'pass12', 'Jill Nelson', '1986-12-12', '909 Fir St', '1234567801', 'jill@example.com'),
('guest13', 'pass13', 'Kevin Scott', '1993-01-13', '1010 Poplar St', '1234567802', 'kevin@example.com'),
('guest14', 'pass14', 'Laura Taylor', '1981-02-14', '1111 Dogwood St', '1234567803', 'laura@example.com'),
('guest15', 'pass15', 'Mike Wilson', '1989-03-15', '1212 Hawthorn St', '1234567804', 'mike@example.com'),
('guest16', 'pass16', 'Nina Young', '1991-04-16', '1313 Juniper St', '1234567805', 'nina@example.com'),
('guest17', 'pass17', 'Oscar Allen', '1982-05-17', '1414 Cypress St', '1234567806', 'oscar@example.com'),
('guest18', 'pass18', 'Paula Baker', '1987-06-18', '1515 Magnolia St', '1234567807', 'paula@example.com'),
('guest19', 'pass19', 'Quincy Carter', '1994-07-19', '1616 Palm St', '1234567808', 'quincy@example.com'),
('guest20', 'pass20', 'Rachel Martinez', '1985-08-20', '1717 Willow St', '1234567809', 'rachel@example.com');

/*Booking*/
INSERT INTO Booking (GuestID, RoomNumber, CheckinDate, CheckoutDate, TotalPrice) VALUES
(1, 101, '2024-05-01', '2024-05-05', 400.00),
(2, 102, '2024-05-02', '2024-05-06', 600.00),
(3, 103, '2024-05-03', '2024-05-07', 1000.00),
(4, 104, '2024-05-04', '2024-05-08', 800.00),
(5, 105, '2024-05-05', '2024-05-09', 1200.00),
(6, 106, '2024-05-06', '2024-05-10', 320.00),
(7, 107, '2024-05-07', '2024-05-11', 720.00),
(8, 108, '2024-05-08', '2024-05-12', 1400.00),
(9, 109, '2024-05-09', '2024-05-13', 2000.00),
(10, 110, '2024-05-10', '2024-05-14', 480.00),
(11, 111, '2024-05-11', '2024-05-15', 880.00),
(12, 112, '2024-05-12', '2024-05-16', 1600.00),
(13, 113, '2024-05-13', '2024-05-17', 680.00),
(14, 114, '2024-05-14', '2024-05-18', 840.00),
(15, 115, '2024-05-15', '2024-05-19', 520.00),
(16, 116, '2024-05-16', '2024-05-20', 760.00),
(17, 117, '2024-05-17', '2024-05-21', 1120.00),
(18, 118, '2024-05-18', '2024-05-22', 800.00),
(19, 119, '2024-05-19', '2024-05-23', 660.00),
(20, 120, '2024-05-20', '2024-05-24', 960.00);

/*Staff*/
INSERT INTO Staff (Username, Password, Name, Position, Salary, DOB, Phone, Email) VALUES
('staff1', 'pass1', 'Anna White', 'Manager', 50000.00, '1975-01-01', '3214567890', 'anna@example.com'),
('staff2', 'pass2', 'Ben Black', 'Receptionist', 30000.00, '1980-02-02', '3214567891', 'ben@example.com'),
('staff3', 'pass3', 'Cara Blue', 'Housekeeper', 25000.00, '1985-03-03', '3214567892', 'cara@example.com'),
('staff4', 'pass4', 'Dave Green', 'Maintenance', 35000.00, '1990-04-04', '3214567893', 'dave@example.com'),
('staff5', 'pass5', 'Eve Brown', 'Cook', 28000.00, '1988-05-05', '3214567894', 'eve@example.com'),
('staff6', 'pass6', 'Frank Gray', 'Manager', 50000.00, '1975-06-06', '3214567895', 'frank@example.com'),
('staff7', 'pass7', 'Gina White', 'Receptionist', 30000.00, '1980-07-07', '3214567896', 'gina@example.com'),
('staff8', 'pass8', 'Hank Black', 'Housekeeper', 25000.00, '1985-08-08', '3214567897', 'hank@example.com'),
('staff9', 'pass9', 'Ivy Blue', 'Maintenance', 35000.00, '1990-09-09', '3214567898', 'ivy@example.com'),
('staff10', 'pass10', 'Jack Green', 'Cook', 28000.00, '1988-10-10', '3214567899', 'jack@example.com'),
('staff11', 'pass11', 'Kate Brown', 'Manager', 50000.00, '1975-11-11', '3214567800', 'kate@example.com'),
('staff12', 'pass12', 'Liam Gray', 'Receptionist', 30000.00, '1980-12-12', '3214567801', 'liam@example.com'),
('staff13', 'pass13', 'Mona White', 'Housekeeper', 25000.00, '1985-01-13', '3214567802', 'mona@example.com'),
('staff14', 'pass14', 'Nick Black', 'Maintenance', 35000.00, '1990-02-14', '3214567803', 'nick@example.com'),
('staff15', 'pass15', 'Olive Blue', 'Cook', 28000.00, '1988-03-15', '3214567804', 'olive@example.com'),
('staff16', 'pass16', 'Paul Green', 'Manager', 50000.00, '1975-04-16', '3214567805', 'paul@example.com'),
('staff17', 'pass17', 'Quincy Brown', 'Receptionist', 30000.00, '1980-05-17', '3214567806', 'quincy@example.com'),
('staff18', 'pass18', 'Rose Gray', 'Housekeeper', 25000.00, '1985-06-18', '3214567807', 'rose@example.com'),
('staff19', 'pass19', 'Steve White', 'Maintenance', 35000.00, '1990-07-19', '3214567808', 'steve@example.com'),
('staff20', 'pass20', 'Tina Black', 'Cook', 28000.00, '1988-08-20', '3214567809', 'tina@example.com');

/*Payment*/
INSERT INTO Payment (BookingID, Amount, PaymentDate, PaymentMethod) VALUES
(1, 400.00, '2024-05-05', 'Credit Card'),
(2, 600.00, '2024-05-06', 'Credit Card'),
(3, 1000.00, '2024-05-07', 'Credit Card'),
(4, 800.00, '2024-05-08', 'Credit Card'),
(5, 1200.00, '2024-05-09', 'Credit Card'),
(6, 320.00, '2024-05-10', 'Credit Card'),
(7, 720.00, '2024-05-11', 'Credit Card'),
(8, 1400.00, '2024-05-12', 'Credit Card'),
(9, 2000.00, '2024-05-13', 'Credit Card'),
(10, 480.00, '2024-05-14', 'Credit Card'),
(11, 880.00, '2024-05-15', 'Credit Card'),
(12, 2400.00, '2024-05-16', 'Credit Card'),
(13, 680.00, '2024-05-17', 'Credit Card'),
(14, 840.00, '2024-05-18', 'Credit Card'),
(15, 520.00, '2024-05-19', 'Credit Card'),
(16, 760.00, '2024-05-20', 'Credit Card'),
(17, 1120.00, '2024-05-21', 'Credit Card'),
(18, 1600.00, '2024-05-22', 'Credit Card'),
(19, 660.00, '2024-05-23', 'Credit Card'),
(20, 960.00, '2024-05-24', 'Credit Card');

/*Manage*/
INSERT INTO Manage (RoomNumber, StaffID) VALUES
(101, 1),
(102, 2),
(103, 3),
(104, 4),
(105, 5),
(106, 6),
(107, 7),
(108, 8),
(109, 9),
(110, 10),
(111, 11),
(112, 12),
(113, 13),
(114, 14),
(115, 15),
(116, 16),
(117, 17),
(118, 18),
(119, 19),
(120, 20);
GO

/* Show all available rooms for guest */
CREATE VIEW AvailableRooms AS
SELECT	Room.RoomNumber, RoomType.Description, RoomType.Capacity, RoomType.PricePerNight, Room.Status
FROM	Room INNER JOIN
		RoomType ON Room.TypeID = RoomType.TypeID
WHERE	(Room.Status = 'Available')
GO

/* List all bookings of a guest */
CREATE VIEW GuestBookingView AS
SELECT * FROM Booking
GO

/* */
CREATE FUNCTION MyBookings (@GuestID int)
RETURNS TABLE
AS RETURN
	SELECT GuestBookingView.BookingID, GuestBookingView.RoomNumber, GuestBookingView.CheckinDate, GuestBookingView.CheckoutDate, GuestBookingView.TotalPrice
	FROM GuestBookingView
	WHERE GuestBookingView.GuestID = @GuestID
GO

/* List all payments of a guest */
CREATE VIEW GuestPaymentView AS
SELECT Payment.PaymentID, Booking.GuestID, Payment.BookingID, Payment.Amount, Payment.PaymentDate, Payment.PaymentMethod
FROM Payment INNER JOIN
	 Booking ON Payment.BookingID = Booking.BookingID
GO

CREATE FUNCTION MyPayments (@GuestID int)
RETURNS TABLE
AS RETURN
	SELECT PaymentID, BookingID, Amount, PaymentDate, PaymentMethod FROM GuestPaymentView
	WHERE GuestPaymentView.GuestID = @GuestID
GO

/* My Info */
CREATE FUNCTION MyInfo (@GuestID int)
RETURNS TABLE
AS RETURN
	SELECT *
	FROM Guest
	WHERE GuestID = @GuestID
GO

CREATE FUNCTION CheckBookingAvailability(
    @new_checkin_date DATE,
    @new_checkout_date DATE,
    @room_number INT
)
RETURNS BIT
AS
BEGIN
    DECLARE @IsAvailable BIT;

    IF NOT EXISTS (
        SELECT 1
        FROM Booking
        WHERE RoomNumber = @room_number
        AND NOT (
            @new_checkin_date >= CheckoutDate OR
            @new_checkout_date <= CheckinDate
        )
    )
    BEGIN
        SET @IsAvailable = 1;
    END
    ELSE
    BEGIN
        SET @IsAvailable = 0;
    END

    RETURN @IsAvailable;
END;
GO

/*new Booking*/
CREATE PROCEDURE dbo.CreateBookingAndPayment
(
    @GuestID INT,
    @RoomNumber INT,
    @CheckinDate DATE,
    @CheckoutDate DATE,
    @PaymentMethod VARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalPrice DECIMAL(10, 2);
    DECLARE @RoomTypeID VARCHAR(50);
    DECLARE @PricePerNight DECIMAL(10, 2);
    DECLARE @NumberOfNights INT;
    DECLARE @BookingID INT;
    DECLARE @PaymentID INT;

    BEGIN TRY
        -- Calculate total price
        SET @NumberOfNights = DATEDIFF(DAY, @CheckinDate, @CheckoutDate);

        SELECT @RoomTypeID = TypeID
        FROM Room
        WHERE RoomNumber = @RoomNumber;

        SELECT @PricePerNight = PricePerNight
        FROM RoomType
        WHERE TypeID = @RoomTypeID;

        SET @TotalPrice = @NumberOfNights * @PricePerNight;

        -- Insert into Booking table
        INSERT INTO Booking (GuestID, RoomNumber, CheckinDate, CheckoutDate, TotalPrice)
        VALUES (@GuestID, @RoomNumber, @CheckinDate, @CheckoutDate, @TotalPrice);

        -- Retrieve the newly inserted BookingID
        SET @BookingID = SCOPE_IDENTITY();

        -- Insert into Payment table
        INSERT INTO Payment (BookingID, Amount, PaymentDate, PaymentMethod)
        VALUES (@BookingID, @TotalPrice, GETDATE(), @PaymentMethod);

        -- Retrieve the newly inserted PaymentID
        SET @PaymentID = SCOPE_IDENTITY();

        -- Return the result
        SELECT @BookingID AS BookingID, @PaymentID AS PaymentID;
    END TRY
    BEGIN CATCH
        -- Handle errors
        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT 
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),
            @ErrorState = ERROR_STATE();

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN;
    END CATCH;
END;
GO

CREATE PROCEDURE DeleteBooking
    @BookingID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CheckinDate DATE;
    DECLARE @Today DATE = GETDATE();
    DECLARE @Result VARCHAR(100);

    SELECT @CheckinDate = CheckinDate 
    FROM Booking 
    WHERE BookingID = @BookingID;

    IF DATEDIFF(DAY, @Today, @CheckinDate) >= 7
    BEGIN
        DELETE FROM Booking WHERE BookingID = @BookingID;
        SET @Result = 'Booking is deleted.';
    END
    ELSE
    BEGIN
        SET @Result = 'Booking is not deleted. CheckinDate is not 7 days later from today.';
    END

    SELECT @Result AS Result;
END;
GO

CREATE PROCEDURE UpdateRoomStatus
AS
BEGIN
    SET NOCOUNT ON;

    -- Update rooms to "Occupied" if the current date is within the booking period
    UPDATE Room
    SET Status = 'Occupied'
    WHERE RoomNumber IN (
        SELECT RoomNumber
        FROM Booking
        WHERE GETDATE() BETWEEN CheckinDate AND CheckoutDate
    );

    -- Update rooms to "Available" if the current date is not within any booking period
    UPDATE Room
    SET Status = 'Available'
    WHERE RoomNumber NOT IN (
        SELECT RoomNumber
        FROM Booking
        WHERE GETDATE() BETWEEN CheckinDate AND CheckoutDate
    );
END;
GO