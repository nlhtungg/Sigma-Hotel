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
