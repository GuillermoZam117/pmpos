CREATE PROCEDURE ConsultarTicketPorID
    @TicketId INT
AS
BEGIN
    SELECT
        t.Id,
        t.TicketNumber,
        t.TotalAmount
    FROM Tickets t
    WHERE t.Id = @TicketId;
END
