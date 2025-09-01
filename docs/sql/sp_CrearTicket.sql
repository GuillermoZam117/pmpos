CREATE PROCEDURE sp_CrearTicket
    @TicketNumber NVARCHAR(50),
    @Date DATETIME,
    @ClienteId INT,
    @TicketTags NVARCHAR(MAX)
AS
    INSERT INTO Tickets (TicketNumber, Date, IsClosed, TicketTags)
    VALUES (@TicketNumber, @Date, 0, @TicketTags);
    SELECT SCOPE_IDENTITY() AS TicketId;
