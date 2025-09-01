CREATE VIEW dbo.VistaOrderTagMaps AS
SELECT
    otm.Id AS MapId,
    otm.OrderTagGroupId,
    otg.Name AS GrupoEtiqueta,
    otm.MenuItemId,
    mi.Name AS Producto
FROM OrderTagMaps otm
INNER JOIN OrderTagGroups otg ON otm.OrderTagGroupId = otg.Id
INNER JOIN MenuItems mi ON otm.MenuItemId = mi.Id;
