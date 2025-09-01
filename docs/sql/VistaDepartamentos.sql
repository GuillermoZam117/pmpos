CREATE VIEW dbo.VistaDepartamentos AS
SELECT
    d.Id AS DepartamentoId,
    d.Name AS Departamento
FROM Departments d;
