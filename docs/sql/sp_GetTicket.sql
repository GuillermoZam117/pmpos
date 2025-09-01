CREATE PROCEDURE sp_GetTicket
    @TicketId INT
AS
    SELECT * FROM VistaTickets WHERE TicketId = @TicketId;
