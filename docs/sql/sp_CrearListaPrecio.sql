CREATE PROCEDURE sp_CrearListaPrecio
    @Name NVARCHAR(255)
AS
    INSERT INTO MenuItemPriceDefinitions (Name) VALUES (@Name);
    SELECT SCOPE_IDENTITY() AS PriceDefId;
