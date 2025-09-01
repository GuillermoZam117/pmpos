CREATE PROCEDURE GetTicketsForAutofactura_json
    @SearchValue NVARCHAR(50)
AS
BEGIN
    -- Buscar ticket por valor (ID o número)
    SELECT * FROM Tickets WHERE TicketNumber = @SearchValue OR Id = TRY_CAST(@SearchValue AS INT);
END
