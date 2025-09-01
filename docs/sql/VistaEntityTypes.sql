CREATE VIEW dbo.VistaEntityTypes AS
SELECT
    et.Id AS EntityTypeId,
    et.Name AS TipoEntidad
FROM EntityTypes et;
