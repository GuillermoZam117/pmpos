CREATE PROCEDURE sp_GetDepartmentById
    @DepartmentId INT
AS
    SELECT * FROM Departments WHERE Id = @DepartmentId;
