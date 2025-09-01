CREATE PROCEDURE sp_AgregarPrecioAPorcion
    @PortionId INT,
    @Price DECIMAL(18,2),
    @PriceTag NVARCHAR(255) = NULL
AS
    INSERT INTO MenuItemPrices (MenuItemPortionId, Price, PriceTag)
    VALUES (@PortionId, @Price, @PriceTag);
