CREATE VIEW dbo.VistaMenuCategorias AS
SELECT DISTINCT GroupCode AS Categoria
FROM MenuItems
WHERE ISNULL(GroupCode, '') <> '';
