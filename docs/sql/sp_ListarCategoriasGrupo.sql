CREATE PROCEDURE sp_ListarCategoriasGrupo
AS
    SELECT DISTINCT GroupCode AS Categoria FROM MenuItems;
