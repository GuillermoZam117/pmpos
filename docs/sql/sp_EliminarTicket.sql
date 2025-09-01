CREATE PROCEDURE sp_EliminarTicket
    @TicketId INT
AS
    DELETE FROM Tickets WHERE Id = @TicketId;
