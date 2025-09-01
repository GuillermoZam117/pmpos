CREATE PROCEDURE sp_EditMenuCategory
    @Id INT,
    @Name NVARCHAR(50),
    @Header NVARCHAR(50),
    @ColumnCount INT,
    @MenuItemButtonColor NVARCHAR(50),
    @MenuItemFontSize INT,
    @PageCount INT,
    @MainButtonColor NVARCHAR(50),
    @MainFontSize INT
AS
    UPDATE ScreenMenuCategories
    SET Name = @Name, Header = @Header, ColumnCount = @ColumnCount, MenuItemButtonColor = @MenuItemButtonColor, MenuItemFontSize = @MenuItemFontSize, PageCount = @PageCount, MainButtonColor = @MainButtonColor, MainFontSize = @MainFontSize
    WHERE Id = @Id;
