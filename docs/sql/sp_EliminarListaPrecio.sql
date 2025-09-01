CREATE PROCEDURE sp_EliminarListaPrecio
    @PriceDefId INT
AS
    DELETE FROM MenuItemPriceDefinitions WHERE Id = @PriceDefId;
