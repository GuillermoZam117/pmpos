CREATE PROCEDURE sp_GetItemsInMenuCategory
    @ScreenMenuCategoryId INT
AS
BEGIN
    SELECT
        mi.Id,
        mi.GroupCode,
        smi.Name,
        smi.Header,
        smi.ScreenMenuCategoryId,
        smi.AutoSelect,
        smi.ButtonColor
    FROM ScreenMenuItems smi
    INNER JOIN MenuItems mi ON smi.MenuItemId = mi.Id
    WHERE smi.ScreenMenuCategoryId = @ScreenMenuCategoryId;
END
