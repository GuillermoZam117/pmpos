CREATE VIEW dbo.VistaOrderTagsPorProducto AS
SELECT
    mi.Id AS MenuItemId,
    mi.Name AS Producto,
    otg.Id AS OrderTagGroupId,
    otg.Name AS GrupoEtiqueta,
    ot.Id AS OrderTagId,
    ot.Name AS Etiqueta
FROM MenuItems mi
INNER JOIN OrderTagMaps otm ON mi.Id = otm.MenuItemId
INNER JOIN OrderTagGroups otg ON otm.OrderTagGroupId = otg.Id
INNER JOIN OrderTags ot ON otg.Id = ot.OrderTagGroupId;
