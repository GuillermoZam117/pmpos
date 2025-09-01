CREATE PROCEDURE sp_GetMenuDetalle
    @Id_Menu INT
AS
BEGIN
    SELECT
        sm.Id,
        sm.Name AS Menu,
        smc.Name AS Categoria,
        smc.Header AS Caption,
        smc.ColumnCount AS Columnas,
        smc.MenuItemButtonColor AS Color,
        smc.MenuItemFontSize AS FontSize,
        smc.PageCount AS Paginas
    FROM ScreenMenus sm
    INNER JOIN ScreenMenuCategories smc ON sm.Id = smc.ScreenMenuId
    WHERE sm.Id = @Id_Menu;
END
