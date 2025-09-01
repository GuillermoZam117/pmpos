CREATE VIEW dbo.VistaMenus AS
SELECT
    sm.Id AS MenuId,
    sm.Name AS Menu
FROM ScreenMenus sm;
