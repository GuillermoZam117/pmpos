CREATE PROCEDURE sp_UpdateScreenMenuItem
    @ScreenMenuCategoryId INT,
    @MenuItemId INT,
    @Name NVARCHAR(100),
    @Header NVARCHAR(100),
    @FontSize INT,
    @ButtonColor NVARCHAR(50),
    @ImagePath NVARCHAR(200)
AS
    UPDATE ScreenMenuItems
    SET Name = @Name, Header = @Header, FontSize = @FontSize, ButtonColor = @ButtonColor, ImagePath = @ImagePath
    WHERE ScreenMenuCategoryId = @ScreenMenuCategoryId AND MenuItemId = @MenuItemId;
