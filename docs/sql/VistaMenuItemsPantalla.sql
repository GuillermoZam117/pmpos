CREATE VIEW dbo.VistaMenuItemsPantalla AS
SELECT
    smi.Id AS ScreenMenuItemId,
    smi.MenuItemId,
    mi.Name AS Producto,
    smi.ScreenMenuCategoryId,
    smc.Name AS Categoria,
    smi.SortOrder
FROM ScreenMenuItems smi
INNER JOIN MenuItems mi ON smi.MenuItemId = mi.Id
INNER JOIN ScreenMenuCategories smc ON smi.ScreenMenuCategoryId = smc.Id;
