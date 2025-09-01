CREATE PROCEDURE sp_GetListaPrecio
    @PriceDefId INT
AS
    SELECT * FROM MenuItemPriceDefinitions WHERE Id = @PriceDefId;
