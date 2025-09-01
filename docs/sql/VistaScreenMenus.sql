CREATE VIEW dbo.VistaScreenMenus AS
SELECT
    sm.Id AS ScreenMenuId,
    sm.Name AS MenuPantalla
FROM ScreenMenus sm;
