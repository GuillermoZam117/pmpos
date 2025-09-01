CREATE PROCEDURE sp_EditDepartment
    @DepartmentId INT,
    @Name NVARCHAR(255)
AS
    UPDATE Departments SET Name = @Name WHERE Id = @DepartmentId;
