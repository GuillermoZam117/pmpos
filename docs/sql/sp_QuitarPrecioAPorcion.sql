CREATE PROCEDURE sp_QuitarPrecioAPorcion
    @PortionId INT,
    @PriceTag NVARCHAR(255)
AS
    DELETE FROM MenuItemPrices
    WHERE MenuItemPortionId = @PortionId AND PriceTag = @PriceTag;
