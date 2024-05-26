/* Show all available rooms for guest */
CREATE VIEW AvailableRooms AS
SELECT	Room.RoomNumber, RoomType.Description, RoomType.Capacity, RoomType.PricePerNight, Room.Status
FROM	Room INNER JOIN
		RoomType ON Room.TypeID = RoomType.TypeID
WHERE	(Room.Status = 'Available')

/* List all bookings of a guest */
CREATE VIEW GuestBookingView AS
SELECT * FROM Booking

CREATE FUNCTION MyBookings (@GuestID int)
RETURNS TABLE
AS RETURN
	SELECT GuestBookingView.BookingID, GuestBookingView.RoomNumber, GuestBookingView.CheckinDate, GuestBookingView.CheckoutDate, GuestBookingView.TotalPrice
	FROM GuestBookingView
	WHERE GuestBookingView.GuestID = @GuestID

SELECT * FROM MyBookings (5)

/* List all payments of a guest */
CREATE VIEW GuestPaymentView AS
SELECT Payment.PaymentID, Booking.GuestID, Payment.BookingID, Payment.Amount, Payment.PaymentDate, Payment.PaymentMethod
FROM Payment INNER JOIN
	 Booking ON Payment.BookingID = Booking.BookingID

SELECT * FROM GuestPaymentView

CREATE FUNCTION MyPayments (@GuestID int)
RETURNS TABLE
AS RETURN
	SELECT PaymentID, BookingID, Amount, PaymentDate, PaymentMethod FROM GuestPaymentView
	WHERE GuestPaymentView.GuestID = @GuestID

SELECT * FROM MyPayments (12)
