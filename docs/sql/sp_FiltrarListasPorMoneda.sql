CREATE PROCEDURE sp_FiltrarListasPorMoneda
    @Moneda NVARCHAR(10)
AS
    SELECT * FROM VistaListasPrecios
    WHERE ListaPrecio LIKE '%' + @Moneda + '%';
