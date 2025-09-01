CREATE VIEW dbo.VistaMenuPreciosPorLista AS
SELECT
    mi.Id AS MenuItemId,
    mi.Name AS Producto,
    mi.GroupCode AS Categoria,
    mip.Id AS PortionId,
    mip.Name AS Porcion,
    ISNULL(mpd.Id, 0) AS PriceDefId,
    ISNULL(mpd.Name, 'BASE') AS ListaPrecio,
    mipr.Price
FROM MenuItems mi
INNER JOIN MenuItemPortions mip ON mi.Id = mip.MenuItemId
LEFT JOIN MenuItemPriceDefinitions mpd ON mip.Id = mpd.Id
LEFT JOIN MenuItemPrices mipr ON mip.Id = mipr.MenuItemPortionId;
