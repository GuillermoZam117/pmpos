CREATE PROCEDURE sp_EditarListaPrecio
    @PriceDefId INT,
    @Nombre NVARCHAR(255)
AS
    UPDATE MenuItemPriceDefinitions
    SET Name = @Nombre
    WHERE Id = @PriceDefId;
