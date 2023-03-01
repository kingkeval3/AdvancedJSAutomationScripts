//declare required variables
const idKey = 'id'
const fieldsKey = 'fields'
const totalInventoryKey = 'totalInventory'
const incomingInventoryKey = 'incomingInventory'
const outgoingInventoryKey = 'outgoingInventory'
const datesForIncomingInventoryKey = 'datesForIncoming'
const lossInventoryKey = 'lossInventory'
const collectedDetailsMetaDataKey = 'collectedMetaData'

var productDetailsMap = new Map()

//Fetch required tables
let cropDetailsTable = base.getTable('Crop Details')
let warehouseActivityTable = base.getTable('Warehouse Activity')
let realTimeInventoryTable = base.getTable('Real Time Inventory')


//fetch and delete all records from previous real-time inventory
var realTimeInventoryTableRecords = await realTimeInventoryTable.selectRecordsAsync({
    fields: []
});

//Real Time Inventory Constants
const realTimeInventoryProductFieldName = 'Product'
const realTimeInventoryInventoryFieldName = 'Inventory'
const realTimeInventoryOutgoingFieldName = 'Outgoing'
const realTimeInventoryIncomingFieldName = 'Incoming'
const realTimeInventoryDateForIncomingFieldName = 'Date for Incoming'
//const realTimeInventoryLossFieldName = 'Loss'



let realTimeInventoryDeleteRecordIds = realTimeInventoryTableRecords.recordIds
while (realTimeInventoryDeleteRecordIds.length > 0) {
    await realTimeInventoryTable.deleteRecordsAsync(realTimeInventoryDeleteRecordIds.slice(0, 50));
    realTimeInventoryDeleteRecordIds = realTimeInventoryDeleteRecordIds.slice(50);
};


//Records from crop-details table
let cropDetailsTableCropToGradeField = 'Crop To Grade'
var cropDetailsTableRecords = await cropDetailsTable.selectRecordsAsync({
    fields: [cropDetailsTableCropToGradeField]
});

//Records from Warehouse Activity
let warehouseActivityProductField = 'Product'
let warehouseActivityType = 'Type'
let warehouseActivityFarmerOrCustomerOrderOrLossQty = 'Order(Farmer or Customer)/Lost Quantity'
let warehouseActivityFinalQty = 'Final Quantity'
let warehouseActivityDate = 'Pickup-Delivery Date'
let warehouseActivityFarmerOrCustomerOrLossDate = 'Order(Farmer or Customer)/Loss Date'
var warehoyseActivityTableRecords = await warehouseActivityTable.selectRecordsAsync({
    fields: [warehouseActivityProductField, warehouseActivityType, warehouseActivityFarmerOrCustomerOrderOrLossQty, warehouseActivityFinalQty, warehouseActivityDate, warehouseActivityFarmerOrCustomerOrLossDate]
});
//Warehouse activity constants
const wAOrderTypeValue = 'Order'
const wACustomerRejectedTypeValue = 'Customer Rejected'
const wARecievedTypeValue = 'Received'
const wAFarmerRejectedTypeValue = 'Farmer Rejected'
const wALossTypeValue = 'Loss'
const wADonationTypeValue = 'Donation'

let todayDate = new Date()
//let startDate = addOrSubstractDays(todayDate,182,false)

let realTimeInventoryTempMap = new Map()
for (let curRecord of warehoyseActivityTableRecords.records) {

    //get required fields from current record
    let curWAProduct = curRecord.getCellValueAsString(warehouseActivityProductField)
    let curWAType = curRecord.getCellValueAsString(warehouseActivityType)
    let curWAQty = undefined
    let curWADate = undefined

    if (!isNullOrEmptyUtil(curWAProduct) && !isNullOrEmptyUtil(curWAType) && !isNullOrEmptyUtil(curRecord.getCellValue(warehouseActivityFinalQty)) &&
        (curWAType != wALossTypeValue ? !isNullOrEmptyUtil(curRecord.getCellValueAsString(warehouseActivityDate)) : !isNullOrEmptyUtil(curRecord.getCellValueAsString(warehouseActivityFarmerOrCustomerOrLossDate)))) {

        curWAQty = parseFloat(curRecord.getCellValue(warehouseActivityFinalQty))
        curWADate = curWAType != wALossTypeValue ? new Date(curRecord.getCellValueAsString(warehouseActivityDate)) : new Date(curRecord.getCellValueAsString(warehouseActivityFarmerOrCustomerOrLossDate))

        let productRecordId = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(idKey) ? realTimeInventoryTempMap.get(curWAProduct).get(idKey) : fetchCropRecordId(curWAProduct)
        let totalInventory = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(totalInventoryKey) ? realTimeInventoryTempMap.get(curWAProduct).get(totalInventoryKey) : 0.0
        let incomingInventory = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(incomingInventoryKey) ? realTimeInventoryTempMap.get(curWAProduct).get(incomingInventoryKey) : 0.0
        let outgoingInventory = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(outgoingInventoryKey) ? realTimeInventoryTempMap.get(curWAProduct).get(outgoingInventoryKey) : 0.0
        let datesForIncoming = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(datesForIncomingInventoryKey) ? realTimeInventoryTempMap.get(curWAProduct).get(datesForIncomingInventoryKey) : []
        let lossInventory = realTimeInventoryTempMap.has(curWAProduct) && realTimeInventoryTempMap.get(curWAProduct).has(lossInventoryKey) ? realTimeInventoryTempMap.get(curWAProduct).get(lossInventoryKey) : 0.0

        //calculate total inventory
        if (checkIfDateComesBeforeOrAfter(curWADate, todayDate, true)) {

            if (curWAType == wARecievedTypeValue || curWAType == wAFarmerRejectedTypeValue || curWAType == wADonationTypeValue) {
                totalInventory = totalInventory + curWAQty
            }

            if (curWAType == wALossTypeValue || curWAType == wAOrderTypeValue || curWAType == wACustomerRejectedTypeValue) {
                totalInventory = totalInventory - curWAQty

                if(curWAType == wALossTypeValue){
                    lossInventory = lossInventory + curWAQty
                }
            }

        }

        //calculate incoming and outgoing inventory
        if (checkIfDateComesBeforeOrAfter(curWADate, todayDate, false)) {

            if (curWAType == wARecievedTypeValue || curWAType == wAFarmerRejectedTypeValue || curWAType == wADonationTypeValue) {
                incomingInventory = incomingInventory + curWAQty
                datesForIncoming.push(curWADate)
            }

            if (curWAType == wAOrderTypeValue || curWAType == wACustomerRejectedTypeValue) {
                outgoingInventory = outgoingInventory + curWAQty
            }

            if(curWAType == wALossTypeValue){
                totalInventory = totalInventory - curWAQty
                lossInventory = lossInventory + curWAQty
            }

        }

        //update real-time inventory temp map
        realTimeInventoryTempMap.set(
            curWAProduct,
            new Map()
            .set(idKey, productRecordId)
            .set(totalInventoryKey, (totalInventory<0?0:totalInventory))
            .set(incomingInventoryKey, incomingInventory)
            .set(outgoingInventoryKey, outgoingInventory)
            .set(datesForIncomingInventoryKey, datesForIncoming)
            .set(lossInventoryKey,lossInventory)
        )
    }
}

//construct real-time inventory update array
let realTimeInventoryUpdateMapArray = []
realTimeInventoryTempMap.forEach((value, key) => {

    let curRealTimeInventoryMap = {}
    curRealTimeInventoryMap[fieldsKey] = {}

    value.forEach((productDetailsValue, productDetailsKey) => {

        //set linked product field
        if (productDetailsKey == idKey) {
            let productRecordIdArr = []
            let productIdObj = {}
            productIdObj[idKey] = productDetailsValue
            productRecordIdArr.push(productIdObj)
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryProductFieldName] = productRecordIdArr
        }
        //set inventory field
        if (productDetailsKey == totalInventoryKey) {
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryInventoryFieldName] = productDetailsValue
        }

        //set incoming inventory field
        if (productDetailsKey == incomingInventoryKey) {
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryIncomingFieldName] = productDetailsValue
        }

        //set outgoing inventory field
        if (productDetailsKey == outgoingInventoryKey) {
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryOutgoingFieldName] = productDetailsValue
        }

        //set date for incoming field
        if (productDetailsKey == datesForIncomingInventoryKey && productDetailsValue.length > 0) {
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryDateForIncomingFieldName] = new Date(Math.min.apply(null, productDetailsValue))
        }

        //set loss inventory
        /*if(productDetailsKey == lossInventoryKey){
            curRealTimeInventoryMap[fieldsKey][realTimeInventoryLossFieldName] = productDetailsValue
        }*/
    })

    //set fields key in update array
    realTimeInventoryUpdateMapArray.push(curRealTimeInventoryMap)
});


//create records in real-time inventory table
while (realTimeInventoryUpdateMapArray.length > 0) {
    await realTimeInventoryTable.createRecordsAsync(realTimeInventoryUpdateMapArray.slice(0, 50))
    realTimeInventoryUpdateMapArray = realTimeInventoryUpdateMapArray.slice(50)
}


//add or substract days from date based on flag
function addOrSubstractDays(date, days, flag) {
    var result = new Date(date);
    result.setDate(flag ? (result.getDate() + days) : (result.getDate() - days));
    return result;
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

function checkIfDateComesBeforeOrAfter(dateToBeChecked, dateToBeCheckedAgainst, checkBeforeFlag) {
    dateToBeChecked.setHours(0, 0, 0, 0)
    dateToBeCheckedAgainst.setHours(0, 0, 0, 0)
    return (checkBeforeFlag ? dateToBeChecked <= dateToBeCheckedAgainst : dateToBeChecked >= dateToBeCheckedAgainst)
}

//pass grade-wise product value and function will return record-id from crop details table
function fetchCropRecordId(product) {
    if (!productDetailsMap.has(product)) {
        for (let curCropDetailRecord of cropDetailsTableRecords.records) {
            if (curCropDetailRecord.getCellValueAsString(cropDetailsTableCropToGradeField) == product) {
                productDetailsMap.set(product, curCropDetailRecord.id)
                return curCropDetailRecord.id
            }
        }
    } else {
        return productDetailsMap.get(product)
    }
}