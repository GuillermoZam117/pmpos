CREATE PROCEDURE sp_GetMenuCategoryById
    @ID INT
AS
BEGIN
    SELECT
        Name,
        Header,
        ColumnCount,
        MenuItemButtonColor,
        MenuItemFontSize,
        PageCount,
        MainButtonColor,
        MainFontSize
    FROM ScreenMenuCategories
    WHERE Id = @ID;
END
