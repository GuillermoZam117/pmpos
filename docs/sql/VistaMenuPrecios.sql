CREATE VIEW dbo.VistaMenuPrecios AS
SELECT
    mipr.Id AS PrecioId,
    mipr.MenuItemPortionId,
    mip.MenuItemId,
    mi.Name AS Producto,
    mip.Name AS Porcion,
    mipr.Price
FROM MenuItemPrices mipr
INNER JOIN MenuItemPortions mip ON mipr.MenuItemPortionId = mip.Id
INNER JOIN MenuItems mi ON mip.MenuItemId = mi.Id;
