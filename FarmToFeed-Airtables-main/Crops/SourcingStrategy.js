//Declare all required variables
const startDateKey = "startDate"
const endDateKey = "endDate"
const demandKey = 'demand'
const idKey = 'id'
const shelfLifeKey = 'shelfLife'
const fieldsKey = 'fields'
const nameKey = 'name'

var productDetailsMap = new Map()

//Fetch required tables
let cropDetailsTable = base.getTable('Crop Details')
let warehouseActivityTable = base.getTable('Warehouse Activity')

//Fetch required records from table

//Records from Crop Details
let cropDetailsTableCropToGradeField = 'Crop To Grade'
let cropDetailsTableShelfLifeField = 'Shelf Life (in days)'
let cropDetailsTableWeeklyDemandField = 'Weekly Demand'
//let cropDetailsTableSourcingTypeField = 'Sourcing Type'
var cropDetailsTableRecords = await cropDetailsTable.selectRecordsAsync({
    fields: [cropDetailsTableCropToGradeField, cropDetailsTableShelfLifeField]
});
//Crop Details Constants
let strategyTypeBulk = 'BULK'
let strategyTypeBaseLoad = 'BASE LOAD'
let strategyTypeAdHoc = 'AD HOC'


//Records from Warehouse Activity
let warehouseActivityProductField = 'Product'
let warehouseActivityType = 'Type'
let warehouseActivityFinalQty = 'Final Quantity'
let warehouseActivityDate = 'Pickup-Delivery Date'
var warehoyseActivityTableRecords = await warehouseActivityTable.selectRecordsAsync({
    fields: [warehouseActivityProductField, warehouseActivityType, warehouseActivityFinalQty, warehouseActivityDate]
});
//Warehouse activity constants
const warehouseActivityOrderStatusValue = 'Order'
const warehouseActivityCustRejectedStatusValue = 'Customer Rejected'


//Fetch last 60 days week range
let last60DaysWeekRange = fetch60DaysDateRangeWeekWise()

//Iterate and prepare 
let sourcingStrategyTempMap = {}
let endDate = new Date()
let startDate = addOrSubstractDays(endDate, 59, false)

for (let curRecord of warehoyseActivityTableRecords.records) {

    //Filter records
    if ((curRecord.getCellValueAsString(warehouseActivityType) == warehouseActivityOrderStatusValue || curRecord.getCellValueAsString(warehouseActivityType) == warehouseActivityCustRejectedStatusValue) &&
        (!isNullOrEmptyUtil(curRecord.getCellValueAsString(warehouseActivityProductField)) && !isNullOrEmptyUtil(curRecord.getCellValueAsString(warehouseActivityFinalQty)) && !isNullOrEmptyUtil(curRecord.getCellValueAsString(warehouseActivityDate))) &&
        (new Date(curRecord.getCellValue(warehouseActivityDate)) >= startDate && new Date(curRecord.getCellValue(warehouseActivityDate)) <= endDate)) {

        //get required values from record
        let curProductInRecord = curRecord.getCellValueAsString(warehouseActivityProductField)
        let curDateInRecord = new Date(curRecord.getCellValue(warehouseActivityDate))
        let curQtyInRecord = parseInt(curRecord.getCellValueAsString(warehouseActivityFinalQty))

        //create required record with grade-wise product name as key
        if (sourcingStrategyTempMap[curProductInRecord] == null) {
            sourcingStrategyTempMap[curProductInRecord] = {}
            addProductDetailsToMap(curProductInRecord)
        }

        //iterate and check for each week for which the warehouse activity record matches by date
        for (let curWeekNum in last60DaysWeekRange) {
            let curWeekStart = last60DaysWeekRange[curWeekNum][startDateKey]
            let curWeekEnd = last60DaysWeekRange[curWeekNum][endDateKey]

            if (checkIfDateInRange(curDateInRecord, curWeekStart, curWeekEnd)) {
                //if week-wise already exits then add the current demand to respective weekly record
                if (sourcingStrategyTempMap[curProductInRecord][curWeekNum] != null) {
                    let sourcingStrategyTempMapCurWeek = sourcingStrategyTempMap[curProductInRecord][curWeekNum]
                    sourcingStrategyTempMapCurWeek[demandKey] = sourcingStrategyTempMapCurWeek[demandKey] + curQtyInRecord
                    sourcingStrategyTempMap[curProductInRecord][curWeekNum] = sourcingStrategyTempMapCurWeek
                }
                //if week-wise not exists then create new record
                else {
                    sourcingStrategyTempMap[curProductInRecord][curWeekNum] = {}
                    sourcingStrategyTempMap[curProductInRecord][curWeekNum][startDateKey] = curWeekStart
                    sourcingStrategyTempMap[curProductInRecord][curWeekNum][endDateKey] = curWeekEnd
                    sourcingStrategyTempMap[curProductInRecord][curWeekNum][demandKey] = curQtyInRecord
                }
                break;
            }
        }

    }
}

//construct update records object array of sourcing strategy
let sourcingStrategyUpdateArray = []
for (let curProduct in sourcingStrategyTempMap) {

    let sourcingStrategyObject = {}
    let sourcingStrategyUpdateFieldsObject = {}

    //Add record id to be updated for each product
    sourcingStrategyObject[idKey] = productDetailsMap.get(curProduct).get(idKey)

    //calculate and add weekly demand average
    let currentProductWeeksCount = Object.keys(sourcingStrategyTempMap[curProduct]).length
    let currentProductsTotalWeeklyDemand = 0

    for (let curWeekDemand in sourcingStrategyTempMap[curProduct]) {
        currentProductsTotalWeeklyDemand = currentProductsTotalWeeklyDemand + sourcingStrategyTempMap[curProduct][curWeekDemand][demandKey]
    }
    currentProductsTotalWeeklyDemand = currentProductsTotalWeeklyDemand / currentProductWeeksCount

    sourcingStrategyUpdateFieldsObject[cropDetailsTableWeeklyDemandField] = currentProductsTotalWeeklyDemand

    //calculate and add sourcing strategy
    /*sourcingStrategyUpdateFieldsObject[cropDetailsTableSourcingTypeField] = {}
    if (productDetailsMap.get(curProduct).get(shelfLifeKey) > 14 && currentProductsTotalWeeklyDemand > 500) {
        sourcingStrategyUpdateFieldsObject[cropDetailsTableSourcingTypeField][nameKey] = strategyTypeBulk
    }
    else if (productDetailsMap.get(curProduct).get(shelfLifeKey) > 4 && productDetailsMap.get(curProduct).get(shelfLifeKey) < 14) {
        sourcingStrategyUpdateFieldsObject[cropDetailsTableSourcingTypeField][nameKey] = strategyTypeBaseLoad
    } else if (productDetailsMap.get(curProduct).get(shelfLifeKey) < 4) {
        sourcingStrategyUpdateFieldsObject[cropDetailsTableSourcingTypeField][nameKey] = strategyTypeAdHoc
    }*/

    //update main object and array
    if (Object.keys(sourcingStrategyUpdateFieldsObject).length > 0) {
        sourcingStrategyObject[fieldsKey] = sourcingStrategyUpdateFieldsObject
        sourcingStrategyUpdateArray.push(sourcingStrategyObject)
    }
}

//Update sourcing strategy in crop details table
let cropDetailsUpdateArray = convertAnyToConst(sourcingStrategyUpdateArray)
while (cropDetailsUpdateArray.length > 0) {
    await cropDetailsTable.updateRecordsAsync(cropDetailsUpdateArray.slice(0, 50));
    cropDetailsUpdateArray = cropDetailsUpdateArray.slice(50);
};

//Fetch Last 35 Days Date Range week wise
function fetch60DaysDateRangeWeekWise() {
    let endDate = new Date()
    let startDate = addOrSubstractDays(endDate, 34, false)

    let dateRangeArray = {}
    let weekCount = 0

    while (startDate < endDate) {

        weekCount = weekCount + 1
        let curEndDate = addOrSubstractDays(startDate, 6, true)

        dateRangeArray[weekCount] = {}
        dateRangeArray[weekCount][startDateKey] = startDate
        dateRangeArray[weekCount][endDateKey] = (curEndDate < endDate ? curEndDate : endDate)

        startDate = addOrSubstractDays(startDate, 7, true)
    }
    return dateRangeArray
}

//Function to add or remove days in a given date
function addOrSubstractDays(date, days, flag) {
    var result = new Date(date);
    result.setDate(flag ? (result.getDate() + days) : (result.getDate() - days));
    return result;
}

function checkIfDateInRange(dateToBeChecked, startDate, endDate) {
    // Checks if date in d is between dates in start and end.
    // Returns a boolean or NaN:
    //    true  : if d is between start and end (inclusive)
    //    false : if d is before start or after end
    //    NaN   : if one or more of the dates is illegal.
    // NOTE: The code inside isFinite does an assignment (=).

    dateToBeChecked.setHours(0, 0, 0, 0)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    return (
        isFinite(dateToBeChecked = dateToBeChecked.valueOf()) &&
        isFinite(startDate = startDate.valueOf()) &&
        isFinite(endDate = endDate.valueOf()) ?
        startDate <= dateToBeChecked && dateToBeChecked <= endDate :
        false
    );
}

//pass grade-wise product value and function will return record-id from crop details table
function addProductDetailsToMap(product) {
    if (!productDetailsMap.has(product)) {
        for (let curCropDetailRecord of cropDetailsTableRecords.records) {
            if (curCropDetailRecord.getCellValueAsString(cropDetailsTableCropToGradeField) == product) {
                productDetailsMap.set(product, new Map()
                    .set(idKey, curCropDetailRecord.id)
                    .set(shelfLifeKey,
                        isNullOrEmptyUtil(curCropDetailRecord.getCellValueAsString(cropDetailsTableShelfLifeField)) ?
                        0 :
                        parseInt(curCropDetailRecord.getCellValueAsString(cropDetailsTableShelfLifeField))))

                break;
            }
        }
    }
}

//check if null,empty,undefined,0,NaN,empty string,false
function isNullOrEmptyUtil(nullCheckValue) {
    if (nullCheckValue) {
        if (typeof nullCheckValue === 'string') {
            if (nullCheckValue.trim()) {
                return false
            } else {
                return true
            }
        } else {
            return false
        }
    } else {
        return true
    }
}

function convertAnyToConst(anyVariable) {
    const constVariable = anyVariable
    return constVariable
}