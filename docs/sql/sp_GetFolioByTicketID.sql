CREATE PROCEDURE sp_GetFolioByTicketID
    @TicketID INT
AS
BEGIN
    SELECT TOP 1 Folio
    FROM Folios
    WHERE TicketID = @TicketID
    ORDER BY FechaAsignacion DESC;
END
