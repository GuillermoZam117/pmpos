CREATE PROCEDURE sp_QuitarCategoriaDeMenu
    @MenuId INT,
    @CategoryId INT
AS
    DELETE FROM ScreenMenuCategories WHERE ScreenMenuId = @MenuId AND Id = @CategoryId;
