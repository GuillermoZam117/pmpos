CREATE VIEW dbo.VistaScreenMenuCategories AS
SELECT
    smc.Id AS ScreenMenuCategoryId,
    smc.ScreenMenuId,
    sm.Name AS MenuPantalla,
    smc.Name AS CategoriaPantalla
FROM ScreenMenuCategories smc
INNER JOIN ScreenMenus sm ON smc.ScreenMenuId = sm.Id;
