CREATE PROCEDURE sp_GetMenus
AS
BEGIN
    SELECT Id, Name FROM ScreenMenus;
END
