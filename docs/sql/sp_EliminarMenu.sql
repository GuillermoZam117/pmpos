CREATE PROCEDURE sp_EliminarMenu
    @MenuId INT
AS
    DELETE FROM ScreenMenus WHERE Id = @MenuId;
