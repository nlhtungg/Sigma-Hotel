CREATE TABLE [Room] (
  [RoomNumber] int PRIMARY KEY,
  [TypeID] varchar(50),
  [Status] varchar(20)
)
GO

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

CREATE TABLE [Booking] (
  [BookingID] int IDENTITY(1,1) PRIMARY KEY,
  [GuestID] int,
  [RoomNumber] int,
  [CheckinDate] date,
  [CheckoutDate] date,
  [TotalPrice] decimal(10,2)
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

CREATE TABLE [Payment] (
  [PaymentID] int IDENTITY(1,1) PRIMARY KEY,
  [BookingID] int,
  [Amount] decimal(10,2),
  [PaymentDate] date,
  [PaymentMethod] varchar(50)
)
GO

CREATE TABLE [Manage] (
  [RoomNumber] int,
  [StaffID] int
)
GO

ALTER TABLE [Room] ADD FOREIGN KEY ([TypeID]) REFERENCES [RoomType] ([TypeID]) ON DELETE CASCADE ON UPDATE CASCADE
GO

ALTER TABLE [Booking] ADD FOREIGN KEY ([GuestID]) REFERENCES [Guest] ([GuestID]) ON DELETE CASCADE ON UPDATE CASCADE
GO

ALTER TABLE [Booking] ADD FOREIGN KEY ([RoomNumber]) REFERENCES [Room] ([RoomNumber]) ON DELETE CASCADE ON UPDATE CASCADE
GO

ALTER TABLE [Payment] ADD FOREIGN KEY ([BookingID]) REFERENCES [Booking] ([BookingID]) ON DELETE CASCADE ON UPDATE CASCADE
GO

ALTER TABLE [Manage] ADD FOREIGN KEY ([StaffID]) REFERENCES [Staff] ([StaffID]) ON DELETE CASCADE ON UPDATE CASCADE
GO

ALTER TABLE [Manage] ADD FOREIGN KEY ([RoomNumber]) REFERENCES [Room] ([RoomNumber]) ON DELETE CASCADE ON UPDATE CASCADE
GO