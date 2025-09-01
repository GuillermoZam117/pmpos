CREATE VIEW dbo.VistaMenuItems AS
SELECT
    Mi.Id AS Id,
    Mi.GroupCode AS Categoria,
    Mi.Name AS Producto,
    Mi.Barcode AS Codigo_de_Barras,
    Mip.Name AS Nombre_de_Porcion,
    Mipr.Price AS Precio
FROM MenuItems Mi
LEFT JOIN MenuItemPortions Mip ON Mi.Id = Mip.MenuItemId
LEFT JOIN MenuItemPrices Mipr ON Mip.Id = Mipr.MenuItemPortionId;
