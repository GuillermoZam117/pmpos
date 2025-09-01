CREATE PROCEDURE sp_CreateMenuCategory
    @ScreenMenuId INT,
    @Name NVARCHAR(50),
    @Header NVARCHAR(50),
    @ColumnCount INT,
    @MenuItemButtonColor NVARCHAR(50),
    @MenuItemFontSize INT,
    @PageCount INT,
    @MainButtonColor NVARCHAR(50),
    @MainFontSize INT
AS
    INSERT INTO ScreenMenuCategories (ScreenMenuId, Name, Header, ColumnCount, MenuItemButtonColor, MenuItemFontSize, PageCount, MainButtonColor, MainFontSize)
    VALUES (@ScreenMenuId, @Name, @Header, @ColumnCount, @MenuItemButtonColor, @MenuItemFontSize, @PageCount, @MainButtonColor, @MainFontSize);
    SELECT SCOPE_IDENTITY() AS ScreenMenuCategoryId;
