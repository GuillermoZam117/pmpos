CREATE PROCEDURE sp_EditMenu
    @Id_Menu INT,
    @Nombre NVARCHAR(50),
    @CategoryColumnCount INT,
    @CategoryColumnWidthRate DECIMAL(5,2),
    @SelectedCategoryFormat NVARCHAR(50),
    @SelectedSubCategoryFormat NVARCHAR(50)
AS
BEGIN
    UPDATE ScreenMenus
    SET Name = @Nombre
    WHERE Id = @Id_Menu;
    -- Actualizar otros campos si existen
END
