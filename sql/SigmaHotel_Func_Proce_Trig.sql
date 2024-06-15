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


// new Booking
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

    IF DATEDIFF(DAY, @Today, @CheckinDate) = 7
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
