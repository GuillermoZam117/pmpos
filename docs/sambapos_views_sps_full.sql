# Código completo de vistas y procedimientos almacenados en SambaPOS

## Vistas

```sql
CREATE VIEW dbo.VistaMenuCategorias AS
SELECT DISTINCT GroupCode AS Categoria
FROM MenuItems
WHERE ISNULL(GroupCode, '') <> '';

CREATE VIEW dbo.VistaMenuPorciones AS
SELECT
    mip.Id AS PortionId,
    mip.MenuItemId,
    mi.Name AS Producto,
    mip.Name AS Porcion
FROM MenuItemPortions mip
INNER JOIN MenuItems mi ON mip.MenuItemId = mi.Id;

CREATE VIEW dbo.VistaMenuPrecios AS
SELECT
    mipr.Id AS PrecioId,
    mipr.MenuItemPortionId,
    mip.MenuItemId,
    mi.Name AS Producto,
    mip.Name AS Porcion,
    mipr.Price
FROM MenuItemPrices mipr
INNER JOIN MenuItemPortions mip ON mipr.MenuItemPortionId = mip.Id
INNER JOIN MenuItems mi ON mip.MenuItemId = mi.Id;

-- ...continúa con el resto de las vistas extraídas...
```

## Procedimientos almacenados

```sql
CREATE PROCEDURE sp_EditarListaPrecio
    @PriceDefId INT,
    @Nombre NVARCHAR(255)
AS
    UPDATE MenuItemPriceDefinitions
    SET Name = @Nombre
    WHERE Id = @PriceDefId;

CREATE PROCEDURE sp_EliminarListaPrecio
    @PriceDefId INT
AS
    DELETE FROM MenuItemPriceDefinitions WHERE Id = @PriceDefId;

CREATE PROCEDURE sp_AgregarProductoALista
    @PriceDefId INT,
    @MenuItemPortionId INT,
    @Price DECIMAL(18,2)
AS
    INSERT INTO MenuItemPrices (MenuItemPortionId, Price, PriceTag)
    VALUES (@MenuItemPortionId, @Price, (SELECT Name FROM MenuItemPriceDefinitions WHERE Id = @PriceDefId));

-- ...continúa con el resto de los procedimientos extraídos...
```

---

> El contenido está truncado por espacio. Si necesitas el código completo de una vista o procedimiento específico, indícalo y lo extraigo en detalle.
