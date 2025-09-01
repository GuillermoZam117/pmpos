CREATE PROCEDURE sp_DeleteMenuCategory
    @ScreenMenuCategoryId INT
AS
BEGIN
    DELETE FROM ScreenMenuItems WHERE ScreenMenuCategoryId = @ScreenMenuCategoryId;
    DELETE FROM ScreenMenuCategories WHERE Id = @ScreenMenuCategoryId;
END
