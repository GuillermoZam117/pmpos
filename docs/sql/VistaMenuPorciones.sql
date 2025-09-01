CREATE VIEW dbo.VistaMenuPorciones AS
SELECT
    mip.Id AS PortionId,
    mip.MenuItemId,
    mi.Name AS Producto,
    mip.Name AS Porcion
FROM MenuItemPortions mip
INNER JOIN MenuItems mi ON mip.MenuItemId = mi.Id;
