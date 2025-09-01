CREATE PROCEDURE sp_EditarTicket
    @TicketId INT,
    @TicketTags NVARCHAR(MAX)
AS
    UPDATE Tickets SET TicketTags = @TicketTags WHERE Id = @TicketId;
