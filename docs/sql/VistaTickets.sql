CREATE VIEW dbo.VistaTickets AS
SELECT
    t.Id AS TicketId,
    t.TicketNumber,
    t.Date,
    t.TotalAmount,
    t.RemainingAmount,
    t.IsClosed,
    e.Name AS Cliente,
    t.TicketTags
FROM Tickets t
LEFT JOIN TicketEntities te ON t.Id = te.Ticket_Id
LEFT JOIN Entities e ON te.EntityId = e.Id;
