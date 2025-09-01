CREATE PROCEDURE sp_CerrarTicket
    @TicketId INT
AS
    UPDATE Tickets SET IsClosed = 1, LastPaymentDate = GETDATE() WHERE Id = @TicketId;
