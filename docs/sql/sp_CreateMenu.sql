CREATE PROCEDURE sp_CreateMenu
    @Nombre NVARCHAR(50),
    @CategoryColumnCount INT,
    @CategoryColumnWidthRate DECIMAL(5,2),
    @SelectedCategoryFormat NVARCHAR(50),
    @SelectedSubCategoryFormat NVARCHAR(50)
AS
BEGIN
    INSERT INTO ScreenMenus (Name) VALUES (@Nombre);
    SELECT SCOPE_IDENTITY() AS MenuId;
END
