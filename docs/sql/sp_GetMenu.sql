CREATE PROCEDURE sp_GetMenu
    @MenuId INT
AS
    SELECT * FROM ScreenMenus WHERE Id = @MenuId;
