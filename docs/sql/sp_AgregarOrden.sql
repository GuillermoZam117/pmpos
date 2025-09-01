CREATE PROCEDURE sp_AgregarOrden
    @TicketId INT,
    @MenuItemId INT,
    @Quantity DECIMAL(18,3),
    @Price DECIMAL(18,2),
    @PortionName NVARCHAR(100)
AS
    INSERT INTO Orders (TicketId, MenuItemId, Quantity, Price, PortionName)
    VALUES (@TicketId, @MenuItemId, @Quantity, @Price, @PortionName);
    SELECT SCOPE_IDENTITY() AS OrderId;
