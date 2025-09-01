CREATE PROCEDURE sp_FiltrarProductos
    @Filtro NVARCHAR(255)
AS
    SELECT * FROM MenuItems WHERE Name LIKE '%' + @Filtro + '%';
