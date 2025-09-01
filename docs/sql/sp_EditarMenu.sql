CREATE PROCEDURE sp_EditarMenu
    @MenuId INT,
    @Name NVARCHAR(255)
AS
    UPDATE ScreenMenus SET Name = @Name WHERE Id = @MenuId;
