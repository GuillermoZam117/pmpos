CREATE VIEW dbo.VistaListasPrecios AS
SELECT
    mpd.Id AS PriceDefId,
    mpd.Name AS ListaPrecio
FROM MenuItemPriceDefinitions mpd;
