CREATE PROCEDURE sp_DeleteMenu
    @Id_Menu INT
AS
BEGIN
    DELETE FROM ScreenMenuItems WHERE ScreenMenuCategoryId IN (SELECT Id FROM ScreenMenuCategories WHERE ScreenMenuId = @Id_Menu);
    DELETE FROM ScreenMenuCategories WHERE ScreenMenuId = @Id_Menu;
    DELETE FROM ScreenMenus WHERE Id = @Id_Menu;
END
