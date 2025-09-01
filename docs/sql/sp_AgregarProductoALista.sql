CREATE PROCEDURE sp_AgregarProductoALista
    @PriceDefId INT,
    @MenuItemPortionId INT,
    @Price DECIMAL(18,2)
AS
    INSERT INTO MenuItemPrices (MenuItemPortionId, Price, PriceTag)
    VALUES (@MenuItemPortionId, @Price, (SELECT Name FROM MenuItemPriceDefinitions WHERE Id = @PriceDefId));
