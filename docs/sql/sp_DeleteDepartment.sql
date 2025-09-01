CREATE PROCEDURE sp_DeleteDepartment
    @DepartmentId INT
AS
    DELETE FROM Departments WHERE Id = @DepartmentId;
